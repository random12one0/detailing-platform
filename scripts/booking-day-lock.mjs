// ROADMAP 97.18 (C-M9) — TWO BOOKINGS SENT AT ONCE CANNOT BOTH BEAT THE DAILY CAP OR THE BUFFER.
//
//   node scripts/booking-day-lock.mjs                    # clean run
//   node scripts/booking-day-lock.mjs --break=no-lock    # the lock line removed: the races must go red
//   node scripts/booking-day-lock.mjs --break=no-recheck # the two refusals removed: the races must go red
//
// WHERE IT RUNS: a brand-new Postgres 17 cluster in a temporary folder, from the same tools
// `scripts/restore-nightly.mjs` uses (RESTORE_TOOLS, or %LOCALAPPDATA%\detailing-platform\tools). Deleted on
// exit. Credential-free; nothing touches the live database.
//
// FIXTURE, said plainly: `businesses` and `business_settings` reduced to the columns the rule reads;
// `bookings` reduced to the columns the rule and the writes read, PLUS the real `bookings_no_overlap` text
// from 20260907000400_multiple_vehicles.sql. The migration under test is applied from its own file.
//
// THE RACES ARE TWO REAL DATABASE SESSIONS. Session A writes through the function and then holds its
// transaction open (pg_sleep) — the moment in production between A's check and A's commit. Session B is
// started only once A is inside that sleep, and writes the second booking. Before this fix nothing in the
// database could refuse B; the first two cases reproduce that with the plain insert create-booking used.
//
// SPEED: 300 plain inserts (the statement PostgREST runs for `.from("bookings").insert(...)`) against 300
// calls of insert_booking_checked, alternating, one autocommit statement each, timed by psql's \timing
// (round trip, plan, execute, commit). The day each lands on already holds two bookings, so the re-check
// has rows to read. WHAT IT DOES NOT PROVE: the edge functions calling these over PostgREST (no Deno here,
// and they are not deployed), or the live database (applying the migration is Andrew's).

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const BREAKS = {
  "no-lock": [/^\s*perform pg_advisory_xact_lock\(.*\);\n/m, ""],
  "no-recheck": [/^\s*raise exception 'booking_(day_full|too_close)' using errcode = 'BK00[12]';\n/gm, "null;\n"],
};
if (BREAK && !BREAKS[BREAK]) { console.error(`unknown --break=${BREAK}; known: ${Object.keys(BREAKS).join(", ")}`); process.exit(2); }

const TOOLS = process.env.RESTORE_TOOLS || join(process.env.LOCALAPPDATA || os.homedir(), "detailing-platform", "tools");
const PG = (n) => join(TOOLS, "pgsql", "bin", n + ".exe");
for (const n of ["initdb", "pg_ctl", "psql"]) {
  if (!existsSync(PG(n))) { console.error(`NOT RUN — ${n}.exe is not at ${PG(n)} (docs/recovery.md says how to unzip the Postgres 17 tools there)`); process.exit(2); }
}

const MIGRATION = readFileSync(join(REPO, "supabase/migrations/20261017200000_booking_day_rules_lock.sql"), "utf8").replace(/\r\n/g, "\n");
let SQL = MIGRATION;
if (BREAK) {
  SQL = MIGRATION.replace(...BREAKS[BREAK]);
  // docs/gotchas.md 102: prove the sabotage landed before believing either colour.
  if (SQL === MIGRATION) { console.error(`--break=${BREAK} did not change the migration text; nothing was sabotaged`); process.exit(2); }
}
const OVERLAP = /alter table public\.bookings add constraint bookings_no_overlap[\s\S]*?;/.exec(
  readFileSync(join(REPO, "supabase/migrations/20260907000400_multiple_vehicles.sql"), "utf8").replace(/\r\n/g, "\n"))?.[0];
if (!OVERLAP) { console.error("could not find bookings_no_overlap in 20260907000400_multiple_vehicles.sql"); process.exit(2); }
// The live table's own (business_id, start_at) index, so the speed case reads the day the way production does.
const START_IDX = /create index bookings_business_start_idx on public\.bookings[^;]*;/.exec(
  readFileSync(join(REPO, "supabase/migrations/20260827000200_tenant_data.sql"), "utf8"))?.[0];
if (!START_IDX) { console.error("could not find bookings_business_start_idx in 20260827000200_tenant_data.sql"); process.exit(2); }

// ---- the throwaway cluster (teardown on exit: a `finally` does not run on SIGTERM, docs/gotchas.md 90)
const TMP = mkdtempSync(join(os.tmpdir(), "booking-day-lock-"));
const DATA = join(TMP, "data");
let started = false;
process.on("exit", () => {
  if (started) spawnSync(PG("pg_ctl"), ["-D", DATA, "-m", "immediate", "-w", "stop"], { windowsHide: true });
  rmSync(TMP, { recursive: true, force: true });
});
for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => process.exit(130));
const port = await new Promise((res) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const CONN = ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", "-h", "127.0.0.1", "-p", String(port), "-U", "postgres", "-d", "postgres"];
const must = (r, what) => { if (r.status !== 0) throw new Error(`${what} exited ${r.status}: ${(r.stderr || "").slice(0, 600)}`); return r; };
must(spawnSync(PG("initdb"), ["-D", DATA, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--locale=C"], { encoding: "utf8", windowsHide: true }), "initdb");
must(spawnSync(PG("pg_ctl"), ["-D", DATA, "-l", join(TMP, "server.log"), "-w", "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "start"], { stdio: "ignore", windowsHide: true }), "pg_ctl start");
started = true;
const sql = (q) => must(spawnSync(PG("psql"), CONN, { input: q, encoding: "utf8", windowsHide: true, maxBuffer: 1 << 26 }), "psql").stdout;
const trySql = (q) => spawnSync(PG("psql"), CONN, { input: q, encoding: "utf8", windowsHide: true });
const session = (q) => new Promise((res) => {
  const t0 = Date.now();
  const p = spawn(PG("psql"), CONN, { windowsHide: true });
  let out = "", err = "";
  p.stdout.on("data", (d) => { out += d; });
  p.stderr.on("data", (d) => { err += d; });
  p.on("close", (code) => res({ code, out: out.trim(), err: err.trim(), ms: Date.now() - t0 }));
  p.stdin.end(q);
});
const version = sql("show server_version").trim();

sql(`
  create extension btree_gist;
  create role anon; create role authenticated; create role service_role;
  create table public.businesses (id uuid primary key, timezone text not null);
  create table public.business_settings (business_id uuid primary key references public.businesses(id),
    buffer_minutes integer not null default 60, max_bookings_per_day integer);
  create table public.bookings (
    id uuid primary key default gen_random_uuid(),
    business_id uuid not null references public.businesses(id),
    customer_name text,
    start_at timestamptz not null,
    end_at timestamptz not null,
    status text not null default 'confirmed' check (status in ('pending','confirmed','cancelled','completed','no_show')),
    bulk_vehicle_count integer,
    deleted_at timestamptz,
    created_at timestamptz not null default now());
  ${OVERLAP}
  ${START_IDX}
`);
sql(SQL);

// One business per case, so no case can read another's rows. Los Angeles, a 45-minute buffer, a cap of 2.
const TZ = "America/Los_Angeles";
const DAY = "2030-03-12"; // PDT, -07:00
const at = (hm) => `${DAY}T${hm}:00-07:00`;
let n = 0;
const business = (cap = 2, buf = 45, tz = TZ) => {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  sql(`insert into public.businesses values ('${id}', '${tz}');
       insert into public.business_settings values ('${id}', ${buf}, ${cap === null ? "null" : cap});`);
  return id;
};
const row = (biz, s, e, extra = {}) => JSON.stringify({ business_id: biz, customer_name: "Race test", start_at: at(s), end_at: at(e), ...extra });
const plainInsert = (r) => {
  const keys = Object.keys(JSON.parse(r)).join(", ");
  return `insert into public.bookings (${keys}) select ${keys} from jsonb_populate_record(null::public.bookings, '${r}') returning id;`;
};
const live = (biz) => Number(sql(`select count(*) from public.bookings where business_id = '${biz}' and status <> 'cancelled' and deleted_at is null`).trim());

// A holds its transaction open after the write; B starts only once A is inside that sleep.
async function race(aSql, bSql) {
  const A = session(`begin;\n${aSql}\nselect pg_sleep(2);\ncommit;\n`);
  const t0 = Date.now();
  while (Number(sql("select count(*) from pg_stat_activity where query like 'select pg_sleep(2)%' and state = 'active'").trim()) === 0) {
    if (Date.now() - t0 > 15000) throw new Error("session A never reached its sleep");
    await new Promise((r) => setTimeout(r, 50));
  }
  const B = await session(bSql);
  return { A: await A, B };
}

const failures = [];
let assertions = 0;
const check = (ok, msg) => { assertions++; if (!ok) failures.push(msg); return ok; };
const cases = [];
const done = (id, observed) => { cases.push({ id, ...observed }); console.log(`  ${id}: ${JSON.stringify(observed)}`); };

console.log(`throwaway Postgres ${version} on 127.0.0.1:${port}${BREAK ? `, --break=${BREAK}` : ""}`);

// 1 · THE DEFECT, reproduced: the plain insert create-booking used saves a third job on a cap-2 day.
{
  const biz = business();
  sql(plainInsert(row(biz, "09:00", "10:00")));
  const r = await race(plainInsert(row(biz, "12:00", "13:00")), plainInsert(row(biz, "15:00", "16:00")));
  const count = live(biz);
  check(r.A.code === 0 && r.B.code === 0 && count === 3, `defect-cap: the plain insert did not reproduce the defect (A ${r.A.code}, B ${r.B.code}, ${count} on the day) — this fixture proves nothing`);
  done("defect-cap", { a_exit: r.A.code, b_exit: r.B.code, bookings_on_cap_2_day: count });
}
// 2 · THE DEFECT, reproduced: a job 20 minutes after another on a 45-minute buffer saves.
{
  const biz = business();
  const r = await race(plainInsert(row(biz, "12:00", "13:00")), plainInsert(row(biz, "13:20", "14:00")));
  const count = live(biz);
  check(r.A.code === 0 && r.B.code === 0 && count === 2, `defect-buffer: the plain insert did not reproduce the defect (A ${r.A.code}, B ${r.B.code}, ${count} saved)`);
  done("defect-buffer", { a_exit: r.A.code, b_exit: r.B.code, saved: count });
}
// 3 · two concurrent bookings that together exceed the cap: one saved, one refused BK001.
{
  const biz = business();
  sql(plainInsert(row(biz, "09:00", "10:00")));
  const r = await race(`select id from public.insert_booking_checked('${row(biz, "12:00", "13:00")}');`,
    `select id from public.insert_booking_checked('${row(biz, "15:00", "16:00")}');`);
  const count = live(biz);
  check(r.A.code === 0, `race-cap: A was refused: ${r.A.err}`);
  check(r.B.code !== 0 && /booking_day_full/.test(r.B.err), `race-cap: B was not refused as day-full (exit ${r.B.code}${r.B.err ? `: ${r.B.err}` : ""})`);
  check(count === 2, `race-cap: ${count} bookings on a cap-2 day`);
  check(r.B.ms > 1000, `race-cap: B answered in ${r.B.ms}ms, so it never waited for A's lock`);
  done("race-cap", { a_exit: r.A.code, b_exit: r.B.code, b_error: r.B.err.split(/\r?\n/)[0].trim(), b_waited_ms: r.B.ms, bookings_on_cap_2_day: count });
}
// 4 · two concurrent bookings that break the buffer: one saved, one refused BK002.
{
  const biz = business();
  const r = await race(`select id from public.insert_booking_checked('${row(biz, "12:00", "13:00")}');`,
    `select id from public.insert_booking_checked('${row(biz, "13:20", "14:00")}');`);
  const count = live(biz);
  check(r.A.code === 0, `race-buffer: A was refused: ${r.A.err}`);
  check(r.B.code !== 0 && /booking_too_close/.test(r.B.err), `race-buffer: B was not refused as too-close (exit ${r.B.code}${r.B.err ? `: ${r.B.err}` : ""})`);
  check(count === 1, `race-buffer: ${count} saved, 20 minutes apart on a 45-minute buffer`);
  done("race-buffer", { a_exit: r.A.code, b_exit: r.B.code, b_error: r.B.err.split(/\r?\n/)[0].trim(), b_waited_ms: r.B.ms, saved: count });
}
// 5 · the reschedule race: two bookings moved at once into a cap-2 day holding one.
{
  const biz = business();
  sql(plainInsert(row(biz, "09:00", "10:00")));
  const other = (d) => JSON.stringify({ business_id: biz, customer_name: "Mover", start_at: `2030-03-${d}T09:00:00-07:00`, end_at: `2030-03-${d}T10:00:00-07:00` });
  const m1 = sql(plainInsert(other("14"))).trim();
  const m2 = sql(plainInsert(other("15"))).trim();
  const patch = (s, e) => JSON.stringify({ start_at: at(s), end_at: at(e) });
  const r = await race(`select id from public.move_booking_checked('${m1}', '${biz}', '${patch("12:00", "13:00")}', '2030-03-14T09:00:00-07:00');`,
    `select id from public.move_booking_checked('${m2}', '${biz}', '${patch("15:00", "16:00")}', '2030-03-15T09:00:00-07:00');`);
  const onDay = Number(sql(`select count(*) from public.bookings where business_id = '${biz}' and (start_at at time zone '${TZ}')::date = '${DAY}'`).trim());
  check(r.A.code === 0 && r.A.out.includes(m1), `race-move: A's move did not land: ${r.A.err || r.A.out}`);
  check(r.B.code !== 0 && /booking_day_full/.test(r.B.err), `race-move: B's move was not refused as day-full (exit ${r.B.code}${r.B.err ? `: ${r.B.err}` : ""})`);
  check(onDay === 2, `race-move: ${onDay} bookings on a cap-2 day after two moves`);
  done("race-move-cap", { a_exit: r.A.code, b_exit: r.B.code, b_error: r.B.err.split(/\r?\n/)[0].trim(), b_waited_ms: r.B.ms, bookings_on_cap_2_day: onDay });
}
// 6 · an ordinary booking through the function: saved, and every column it did not send takes its default.
{
  const biz = business();
  const got = sql(`select status || '|' || (id is not null) || '|' || (created_at is not null) || '|' || coalesce(bulk_vehicle_count::text, 'null')
    from public.insert_booking_checked('${row(biz, "12:00", "13:00")}');`).trim();
  check(got === "confirmed|true|true|null", `defaults: an ordinary booking came back as ${got}`);
  // a cancelled job, a soft-deleted one and a bulk job do not count, as in validateSlot
  sql(plainInsert(row(biz, "15:00", "16:00", { status: "cancelled" })) + plainInsert(row(biz, "16:00", "17:00", { deleted_at: "2030-01-01T00:00:00Z" }))
    + plainInsert(row(biz, "17:00", "18:00", { bulk_vehicle_count: 10 })));
  const second = trySql(`select id from public.insert_booking_checked('${row(biz, "19:00", "20:00")}');`);
  check(second.status === 0, `exemptions: a second booking on a day holding one live job was refused: ${second.stderr}`);
  done("ordinary-and-exemptions", { returned: got, second_exit: second.status });
}
// 7 · the fence the callers rely on: a move from a start the row no longer has returns no row, no error.
{
  const biz = business();
  const id = sql(plainInsert(row(biz, "09:00", "10:00"))).trim();
  const r = trySql(`select count(*) from public.move_booking_checked('${id}', '${biz}', '${JSON.stringify({ start_at: at("12:00"), end_at: at("13:00") })}', '2030-03-12T08:00:00-07:00');`);
  const still = sql(`select start_at = '${at("09:00")}'::timestamptz from public.bookings where id = '${id}'`).trim();
  check(r.status === 0 && r.stdout.trim() === "0" && still === "t", `fence: a stale move wrote or errored (exit ${r.status}, ${r.stdout.trim()} rows, unchanged ${still})`);
  done("fence-holds", { exit: r.status, rows: r.stdout.trim(), unchanged: still });
}
// 8 · speed: a single ordinary booking, before and after.
{
  const biz = business(6, 45, "UTC");
  const N = 300;
  sql(`insert into public.bookings (business_id, customer_name, start_at, end_at)
       select '${biz}'::uuid, 'Seed', (d + interval '8 hours') at time zone 'UTC', (d + interval '9 hours') at time zone 'UTC'
         from generate_series(timestamp '2031-01-01', timestamp '2031-01-01' + interval '${2 * N - 1} days', interval '1 day') d
       union all
       select '${biz}'::uuid, 'Seed', (d + interval '10 hours') at time zone 'UTC', (d + interval '11 hours') at time zone 'UTC'
         from generate_series(timestamp '2031-01-01', timestamp '2031-01-01' + interval '${2 * N - 1} days', interval '1 day') d;
       analyze public.bookings;`);
  const day = (i) => new Date(Date.UTC(2031, 0, 1 + i)).toISOString().slice(0, 10);
  const r = (i) => JSON.stringify({ business_id: biz, customer_name: "Timed", start_at: `${day(i)}T13:00:00Z`, end_at: `${day(i)}T14:00:00Z` });
  let script = "\\timing on\n";
  for (let i = 0; i < N; i++) {
    script += plainInsert(r(2 * i)) + "\n";
    script += `select id from public.insert_booking_checked('${r(2 * i + 1)}');\n`;
  }
  const out = sql(script);
  const times = [...out.matchAll(/^Time: ([\d.]+) ms/gm)].map((m) => Number(m[1]));
  const plain = times.filter((_, i) => i % 2 === 0).sort((a, b) => a - b);
  const locked = times.filter((_, i) => i % 2 === 1).sort((a, b) => a - b);
  const q = (a, p) => a[Math.min(a.length - 1, Math.floor(a.length * p))];
  const s = { n_each: plain.length, plain_median_ms: q(plain, 0.5), plain_p95_ms: q(plain, 0.95), checked_median_ms: q(locked, 0.5), checked_p95_ms: q(locked, 0.95) };
  check(times.length === 2 * N, `speed: ${times.length} timings of ${2 * N}`);
  check(live(biz) === 6 * N, `speed: ${live(biz)} bookings after the timed run, expected ${6 * N} (a timed insert was refused)`);
  // "No longer than before": the new path's typical booking sits inside the old path's own normal spread.
  check(s.checked_median_ms <= s.plain_p95_ms, `speed: a checked booking's median ${s.checked_median_ms}ms is past the plain insert's p95 ${s.plain_p95_ms}ms`);
  done("speed", s);
}

const EXPECTED = 8;
const LOG = `artifacts/booking-day-lock/run${BREAK ? "." + BREAK : ""}.json`;
mkdirSync(join(REPO, "artifacts/booking-day-lock"), { recursive: true });
writeFileSync(join(REPO, LOG), JSON.stringify({ postgres: version, break: BREAK || null, cases, failures }, null, 1));
const defect = cases.filter((c) => c.id.startsWith("defect-")).every((c) => c.a_exit === 0 && c.b_exit === 0);
const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "booking-day-lock",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: EXPECTED,
  discovered_targets: cases.length,
  attempted_targets: cases.length,
  completed_targets: cases.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 18,
  failures,
  warnings: [
    "Throwaway local Postgres with reduced businesses/business_settings/bookings tables; the migration and bookings_no_overlap are applied from their real files.",
    "Does not run the edge functions (no Deno here, and they are not deployed) or touch the live database; applying the migration is Andrew's.",
  ],
  artifacts: [LOG],
  canary: { id: "plain-insert-beats-cap-and-buffer", observed_failure: defect },
  dimensions: { break: BREAK || undefined, item: "97.18", postgres: version },
  observed: Object.fromEntries(cases.map((c) => [c.id, c])),
});
console.log(`receipt: ${path}\n${status.toUpperCase()} — ${cases.length} of ${EXPECTED} cases, ${assertions} assertions, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
