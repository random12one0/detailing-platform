// ROADMAP 97.18 (C-M9) — TWO BOOKINGS SENT AT ONCE CANNOT BOTH BEAT THE DAILY CAP OR THE BUFFER.
//
//   node scripts/booking-day-lock.mjs                    # clean run
//   node scripts/booking-day-lock.mjs --break=no-lock    # the lock line removed: the races must go red
//   node scripts/booking-day-lock.mjs --break=no-recheck # the two refusals removed: the races must go red
//   node scripts/booking-day-lock.mjs --break=drop-key   # the checked writes drop one key: the real-payload case must go red
//   node scripts/booking-day-lock.mjs --break=slow       # the lock made 6 ms slow: the R4 speed bar must go red
//
// WHERE IT RUNS: a brand-new Postgres 17 cluster in a temporary folder, from the same tools
// `scripts/restore-nightly.mjs` uses (RESTORE_TOOLS, or %LOCALAPPDATA%\detailing-platform\tools). Deleted on
// exit. Credential-free; nothing touches the live database.
//
// FIXTURE, said plainly: EVERY file in supabase/migrations/ is replayed in order, so `bookings`,
// `businesses` and `business_settings` are the real tables with their real columns, constraints, indexes,
// triggers and grants, and the migration under test is applied in its place in that order (sabotaged
// there under --break). Stood in for, because they are Supabase's and not this repo's: the `auth`,
// `storage`, `vault`, `cron` and `net` schemas (just the tables and functions the migrations name), the
// roles, and Supabase's default grants on `public`. The two `create extension pg_cron / pg_net` lines are
// skipped (no such extension here; their schemas are the stand-ins). Every race and timed write runs as
// `service_role`, the role the edge functions hold. (Supervisor 2026-10-17: the first version proved this
// on cut-down copies of three tables.)
//
// THE RACES ARE TWO REAL DATABASE SESSIONS. Session A writes through the function and then holds its
// transaction open (pg_sleep) — the moment in production between A's check and A's commit. Session B is
// started only once A is inside that sleep, and writes the second booking. Before this fix nothing in the
// database could refuse B; the first two cases reproduce that with the plain insert create-booking used.
//
// SPEED: 300 plain inserts (the statement PostgREST runs for `.from("bookings").insert(...)`) against 300
// calls of insert_booking_checked, alternating, one autocommit statement each, timed by psql's \timing
// (round trip, plan, execute, commit). The day each lands on already holds two bookings, so the re-check
// has rows to read, and the table's real triggers run on both. ROADMAP R4, as Andrew set it 2026-10-17:
// the checked save may be no more than 5 ms slower (R4_MS), held at the median and at the 95th percentile.
// WHAT IT DOES NOT PROVE: the edge functions calling these over PostgREST (tests/day-rule-refusal.test.mjs
// runs the handlers in memory), or the live database (applying the migration is Andrew's).

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import os from "node:os";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const BREAKS = {
  "no-lock": [/^\s*perform pg_advisory_xact_lock\(.*\);\n/m, ""],
  "no-recheck": [/^\s*raise exception 'booking_(day_full|too_close)' using errcode = 'BK00[12]';\n/gm, "null;\n"],
  // both checked writes silently drop one key the callers send: only the real-payload case may go red
  "drop-key": [/from jsonb_object_keys\((p_row|p_patch)\) k/g, "from jsonb_object_keys($1 - 'customer_notes') k"],
  // a lock 6 ms slow: only the R4 speed bar may go red
  "slow": [/^([ \t]*)perform pg_advisory_xact_lock\(/m, "$1perform pg_sleep(0.006);\n$1perform pg_advisory_xact_lock("],
};
if (BREAK && !BREAKS[BREAK]) { console.error(`unknown --break=${BREAK}; known: ${Object.keys(BREAKS).join(", ")}`); process.exit(2); }

const TOOLS = process.env.RESTORE_TOOLS || join(process.env.LOCALAPPDATA || os.homedir(), "detailing-platform", "tools");
const PG = (n) => join(TOOLS, "pgsql", "bin", n + ".exe");
for (const n of ["initdb", "pg_ctl", "psql"]) {
  if (!existsSync(PG(n))) { console.error(`NOT RUN — ${n}.exe is not at ${PG(n)} (docs/recovery.md says how to unzip the Postgres 17 tools there)`); process.exit(2); }
}

const DIR = join(REPO, "supabase/migrations");
const UNDER_TEST = "20261018030645_booking_day_rules_lock.sql";
const FILES = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
if (!FILES.includes(UNDER_TEST)) { console.error(`${UNDER_TEST} is not in supabase/migrations/`); process.exit(2); }
const MIGRATION = readFileSync(join(DIR, UNDER_TEST), "utf8").replace(/\r\n/g, "\n");
let SQL = MIGRATION;
if (BREAK) {
  SQL = MIGRATION.replace(...BREAKS[BREAK]);
  // docs/gotchas.md 102: prove the sabotage landed before believing either colour.
  if (SQL === MIGRATION) { console.error(`--break=${BREAK} did not change the migration text; nothing was sabotaged`); process.exit(2); }
}
// ROADMAP 97.18 R4, as Andrew set it 2026-10-17 23:11: the lock adds no more than 5 ms per booking.
const R4_MS = 5;
const NO_EXT = /^[ \t]*create extension if not exists (pg_cron|pg_net);[ \t]*$/gm;

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

// Supabase's own part of the database, stood in for: only what the migrations name.
sql(`
  create role anon nologin noinherit; create role authenticated nologin noinherit;
  create role service_role nologin noinherit bypassrls; create role supabase_admin nologin;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, phone text,
    raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', created_at timestamptz default now(),
    updated_at timestamptz default now(), last_sign_in_at timestamptz, email_confirmed_at timestamptz,
    banned_until timestamptz, deleted_at timestamptz, is_anonymous boolean default false);
  create table auth.sessions (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
    created_at timestamptz default now(), updated_at timestamptz, not_after timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create function auth.role() returns text language sql stable as $$ select nullif(current_setting('request.jwt.claim.role', true), '') $$;
  create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
  grant usage on schema auth to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (id text primary key, name text not null, owner uuid, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now());
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),
    name text, owner uuid, owner_id text, metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now(),
    last_accessed_at timestamptz default now(), version text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$
    select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
  grant usage on schema storage to anon, authenticated, service_role;
  create schema cron;
  create table cron.job (jobid bigserial primary key, schedule text, command text, jobname text unique, active boolean default true);
  create table cron.job_run_details (runid bigserial primary key, jobid bigint, status text, return_message text,
    start_time timestamptz, end_time timestamptz);
  create function cron.schedule(job_name text, schedule text, command text) returns bigint language sql as $$
    insert into cron.job (jobname, schedule, command) values (job_name, schedule, command)
    on conflict (jobname) do update set schedule = excluded.schedule, command = excluded.command returning jobid $$;
  create function cron.unschedule(job_name text) returns boolean language sql as $$ delete from cron.job where jobname = job_name returning true $$;
  create schema net;
  create table net._http_response (id bigint, status_code integer, content text, content_type text, headers jsonb,
    timed_out boolean, error_msg text, created timestamptz default now());
  create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}',
    timeout_milliseconds integer default 5000) returns bigint language sql as $$ select 0::bigint $$;
  create function net.http_get(url text, params jsonb default '{}', headers jsonb default '{}',
    timeout_milliseconds integer default 5000) returns bigint language sql as $$ select 0::bigint $$;
  create schema vault;
  create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text,
    created_at timestamptz default now());
  create view vault.decrypted_secrets as select id, name, secret as decrypted_secret, description, created_at from vault.secrets;
  create function vault.create_secret(new_secret text, new_name text default null, new_description text default '')
    returns uuid language sql as $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
`);
// Every migration, in order; the one under test from SQL (sabotaged under --break).
let replayed = 0;
for (const f of FILES) {
  const text = f === UNDER_TEST ? SQL : readFileSync(join(DIR, f), "utf8").replace(/\r\n/g, "\n").replace(NO_EXT, "-- (replay) $&");
  const r = trySql(text);
  if (r.status !== 0) { console.error(`NOT RUN — replaying ${f} failed: ${(r.stderr || "").slice(0, 800)}`); process.exit(2); }
  replayed++;
}
const svc = (q) => `set role service_role;\n${q}`;

// One business per case, so no case can read another's rows. Los Angeles, a 45-minute buffer, a cap of 2.
const TZ = "America/Los_Angeles";
const DAY = "2030-03-12"; // PDT, -07:00
const at = (hm) => `${DAY}T${hm}:00-07:00`;
let n = 0;
const business = (cap = 2, buf = 45, tz = TZ) => {
  const id = `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  sql(`insert into public.businesses (id, slug, name, timezone) values ('${id}', 'race-${n}', 'Race ${n}', '${tz}');
       insert into public.business_settings (business_id, buffer_minutes, max_bookings_per_day) values ('${id}', ${buf}, ${cap === null ? "null" : cap})
       on conflict (business_id) do update set buffer_minutes = excluded.buffer_minutes, max_bookings_per_day = excluded.max_bookings_per_day;`);
  return id;
};
// The columns create-booking always sends that the real table requires.
const REQUIRED = { customer_phone: "5555550100", service_type: "mobile" };
const row = (biz, s, e, extra = {}) => JSON.stringify({ business_id: biz, customer_name: "Race test", ...REQUIRED, start_at: at(s), end_at: at(e), ...extra });
const plainInsert = (r) => {
  const keys = Object.keys(JSON.parse(r)).join(", ");
  return `insert into public.bookings (${keys}) select ${keys} from jsonb_populate_record(null::public.bookings, '${r}') returning id;`;
};
const live = (biz) => Number(sql(`select count(*) from public.bookings where business_id = '${biz}' and status <> 'cancelled' and deleted_at is null`).trim());

// A holds its transaction open after the write; B starts only once A is inside that sleep.
async function race(aSql, bSql) {
  const A = session(svc(`begin;\n${aSql}\nselect pg_sleep(2);\ncommit;\n`));
  const t0 = Date.now();
  while (Number(sql("select count(*) from pg_stat_activity where query like 'select pg_sleep(2)%' and state = 'active'").trim()) === 0) {
    if (Date.now() - t0 > 15000) throw new Error("session A never reached its sleep");
    await new Promise((r) => setTimeout(r, 50));
  }
  const B = await session(svc(bSql));
  return { A: await A, B };
}

const failures = [];
let assertions = 0;
const check = (ok, msg) => { assertions++; if (!ok) failures.push(msg); return ok; };
const cases = [];
const done = (id, observed) => { cases.push({ id, ...observed }); console.log(`  ${id}: ${JSON.stringify(observed)}`); };

console.log(`throwaway Postgres ${version} on 127.0.0.1:${port}${BREAK ? `, --break=${BREAK}` : ""}`);

// 0 · THE REAL SCHEMA: every migration replayed, and only the edge functions' role may call the writes.
{
  const may = (role, fn) => sql(`select has_function_privilege('${role}', 'public.${fn}', 'execute')`).trim();
  const fns = ["insert_booking_checked(jsonb)", "move_booking_checked(uuid, uuid, jsonb, timestamptz, text)"];
  const grants = Object.fromEntries(["anon", "authenticated", "service_role"].map((r) => [r, fns.map((f) => may(r, f)).join("")]));
  const triggers = sql(`select string_agg(tgname, ',' order by tgname) from pg_trigger where tgrelid = 'public.bookings'::regclass and not tgisinternal`).trim();
  const columns = Number(sql(`select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'bookings'`).trim());
  check(replayed === FILES.length, `real-schema: replayed ${replayed} of ${FILES.length} migrations`);
  check(grants.anon === "ff", `real-schema: anon may call the checked writes (${grants.anon})`);
  check(grants.authenticated === "ff", `real-schema: authenticated may call the checked writes (${grants.authenticated})`);
  check(grants.service_role === "tt", `real-schema: service_role may not call the checked writes (${grants.service_role})`);
  done("real-schema", { migrations_replayed: replayed, migrations_in_folder: FILES.length, bookings_columns: columns, bookings_triggers: triggers, execute: grants });
}

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
  const other = (d) => JSON.stringify({ business_id: biz, customer_name: "Mover", ...REQUIRED, start_at: `2030-03-${d}T09:00:00-07:00`, end_at: `2030-03-${d}T10:00:00-07:00` });
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
  const got = sql(svc(`select status || '|' || (id is not null) || '|' || (created_at is not null) || '|' || coalesce(bulk_vehicle_count::text, 'null')
      || '|' || payment_status || '|' || vehicle_size || '|' || total_price
    from public.insert_booking_checked('${row(biz, "12:00", "13:00")}');`)).trim();
  check(got === "confirmed|true|true|null|pending|small|0", `defaults: an ordinary booking came back as ${got}`);
  // a cancelled job, a soft-deleted one and a bulk job do not count, as in validateSlot
  sql(plainInsert(row(biz, "15:00", "16:00", { status: "cancelled" })) + plainInsert(row(biz, "16:00", "17:00", { deleted_at: "2030-01-01T00:00:00Z" }))
    + plainInsert(row(biz, "17:00", "18:00", { bulk_vehicle_count: 10 })));
  const second = trySql(svc(`select id from public.insert_booking_checked('${row(biz, "19:00", "20:00")}');`));
  check(second.status === 0, `exemptions: a second booking on a day holding one live job was refused: ${second.stderr}`);
  done("ordinary-and-exemptions", { returned: got, second_exit: second.status });
}
// 7 · the fence the callers rely on: a move from a start the row no longer has returns no row, no error.
{
  const biz = business();
  const id = sql(plainInsert(row(biz, "09:00", "10:00"))).trim();
  const r = trySql(svc(`select count(*) from public.move_booking_checked('${id}', '${biz}', '${JSON.stringify({ start_at: at("12:00"), end_at: at("13:00") })}', '2030-03-12T08:00:00-07:00');`));
  const still = sql(`select start_at = '${at("09:00")}'::timestamptz from public.bookings where id = '${id}'`).trim();
  check(r.status === 0 && r.stdout.trim() === "0" && still === "t", `fence: a stale move wrote or errored (exit ${r.status}, ${r.stdout.trim()} rows, unchanged ${still})`);
  done("fence-holds", { exit: r.status, rows: r.stdout.trim(), unchanged: still });
}
// 8 · THE REAL PAYLOAD (reviewer, 2026-10-18): the cases above send six keys. create-booking sends every key
// its insert names, so it is captured here from the REAL handler, run in memory through the shared harness,
// and written twice on the real table: through insert_booking_checked, and through the plain insert PostgREST
// runs for `.insert`. The two stored rows must be the same, as sent AND with every empty key filled.
// update-booking's patch (every EDITABLE_FIELDS name, the size label it adds, and the move) the same way
// through move_booking_checked against the plain update. campaign_id and plan_id stay empty: they point at
// rows this case does not create.
{
  const { bookingFixture, fixtureBooking } = await import("./lib/bookingConsentFixture.mjs");
  const f = bookingFixture({ collision: false });
  let sent = null;
  const rpc = f.db.rpc;
  f.db.rpc = (name, args) => { if (name === "insert_booking_checked") sent = args.p_row; return rpc(name, args); };
  const booked = await f.book(fixtureBooking);
  const keys = Object.keys(sent || {});
  check(booked.status === 200 && keys.length >= 30, `real-payload: create-booking did not hand insert_booking_checked its row (status ${booked.status}, ${keys.length} keys)`);
  const pair = [business(null, 0), business(null, 0)];
  const cust = pair.map((b) => sql(`insert into public.customers (business_id, name, phone) values ('${b}', 'Maria Lopez', '5550123456') returning id`).trim());
  const DROP = ["id", "business_id", "customer_id", "created_at", "updated_at"];
  const stored = (id) => sql(`select (to_jsonb(b) - '${DROP.join("' - '")}')::text from public.bookings b where id = '${id}'`).trim();
  const FILL = { booking_group_id: "8f0c2a4e-1d3b-4c5a-9e7f-0a1b2c3d4e5f", customer_address: "1 Fixture Way", address_source: "picked",
    travel_zone_address_mismatch: true, travel_zone: "North", price_adjustments: [{ label: "Weekend", amount: 10 }], vehicle_model: "Civic",
    vehicle_year: "2019", vehicle_condition: "moderate", has_water: true, has_power: false, customer_notes: "Gate code 12",
    admin_notes: "Regular", applied_promo_code: "SPRING" };
  const sides = (payload, hh) => pair.map((b, i) => JSON.stringify({ ...payload, business_id: b, customer_id: cust[i],
    start_at: `2030-04-02T${hh}:00:00Z`, end_at: `2030-04-02T${hh + 1}:00:00Z` }).replace(/'/g, "''"));
  const variants = { as_sent: [sent || {}, 17], filled: [{ ...(sent || {}), ...FILL, id: undefined }, 19] };
  const seen = {};
  for (const [name, [payload, hh]] of Object.entries(variants)) {
    const [p, c] = sides(payload, hh);
    const plainId = trySql(svc(plainInsert(p))).stdout.trim();
    const checked = trySql(svc(`select id from public.insert_booking_checked('${c}');`));
    const same = !!plainId && checked.status === 0 && stored(plainId) === stored(checked.stdout.trim());
    check(same, `real-payload ${name}: the checked insert stored a different row from the plain insert (${checked.status === 0 ? "rows differ" : checked.stderr.trim()})`);
    seen[name] = { keys: Object.keys(JSON.parse(c)).length, checked_exit: checked.status, same_row: same };
    if (name === "filled") {
      const empty = trySql(`select string_agg(k, ',') from jsonb_each(to_jsonb((select b from public.bookings b where id = '${checked.stdout.trim()}'))) e(k, v)
        where k = any(array['${Object.keys(JSON.parse(c)).filter((k) => !["campaign_id", "plan_id"].includes(k)).join("','")}']) and v = 'null'::jsonb`).stdout.trim();
      check(checked.status === 0 && empty === "", `real-payload filled: keys sent with a value were stored empty: ${empty || checked.stderr.trim()}`);
      seen.filled.stored_empty = empty || null;
    }
  }
  // update-booking: the twin rows the filled insert just wrote are moved by the same patch, one each way.
  const twins = pair.map((b) => sql(`select id from public.bookings where business_id = '${b}' and customer_notes = 'Gate code 12'`).trim());
  const PATCH = { status: "completed", admin_notes: "Moved by the owner", customer_name: "Maria L.", customer_phone: "5550123499",
    customer_email: "maria@example.invalid", customer_address: "2 Fixture Way", service_type: "mobile", vehicle_size: "large",
    vehicle_size_label: "Large", vehicle_model: "Accord", vehicle_condition: "heavy", customer_notes: "Gate code 34", has_water_electric: true,
    has_water: false, has_power: true, final_amount: 210.5, payment_status: "paid", payment_notes: "Cash", finalized_at: "2030-04-03T20:00:00Z",
    miles: 12, start_at: "2030-04-03T17:00:00Z", end_at: "2030-04-03T19:00:00Z" };
  const patch = JSON.stringify(PATCH).replace(/'/g, "''");
  const cols = Object.keys(PATCH).join(", ");
  const plainMove = trySql(svc(`update public.bookings set (${cols}) = (select ${cols} from jsonb_populate_record(null::public.bookings, '${patch}'))
    where id = '${twins[0]}' and status = 'confirmed' returning id;`));
  const checkedMove = trySql(svc(`select id from public.move_booking_checked('${twins[1]}', '${pair[1]}', '${patch}', '2030-04-02T19:00:00Z', 'confirmed');`));
  const moveSame = plainMove.status === 0 && checkedMove.stdout.trim() === twins[1] && stored(twins[0]) === stored(twins[1]);
  check(moveSame, `real-payload move: the checked move stored a different row from the plain update (${checkedMove.status === 0 ? `moved ${checkedMove.stdout.trim() || "nothing"}` : checkedMove.stderr.trim()})`);
  const moveEmpty = sql(`select string_agg(k, ',') from jsonb_each(to_jsonb((select b from public.bookings b where id = '${twins[1]}'))) e(k, v)
    where k = any(array['${Object.keys(PATCH).join("','")}']) and v = 'null'::jsonb`).trim();
  check(moveEmpty === "", `real-payload move: patched keys were stored empty: ${moveEmpty}`);
  done("real-payload", { create_booking_keys: keys.length, ...seen, move: { keys: Object.keys(PATCH).length, same_row: moveSame, stored_empty: moveEmpty || null } });
}
// 9 · speed: a single ordinary booking, before and after.
{
  const biz = business(6, 45, "UTC");
  const N = 300;
  sql(`insert into public.bookings (business_id, customer_name, customer_phone, service_type, start_at, end_at)
       select '${biz}'::uuid, 'Seed', '5555550100', 'mobile', (d + interval '8 hours') at time zone 'UTC', (d + interval '9 hours') at time zone 'UTC'
         from generate_series(timestamp '2031-01-01', timestamp '2031-01-01' + interval '${2 * N - 1} days', interval '1 day') d
       union all
       select '${biz}'::uuid, 'Seed', '5555550100', 'mobile', (d + interval '10 hours') at time zone 'UTC', (d + interval '11 hours') at time zone 'UTC'
         from generate_series(timestamp '2031-01-01', timestamp '2031-01-01' + interval '${2 * N - 1} days', interval '1 day') d;
       analyze public.bookings;`);
  const day = (i) => new Date(Date.UTC(2031, 0, 1 + i)).toISOString().slice(0, 10);
  const r = (i) => JSON.stringify({ business_id: biz, customer_name: "Timed", ...REQUIRED, start_at: `${day(i)}T13:00:00Z`, end_at: `${day(i)}T14:00:00Z` });
  let script = svc("\\timing on\n");
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
  const ms = (x) => Math.round(x * 1000) / 1000;
  s.extra_median_ms = ms(s.checked_median_ms - s.plain_median_ms);
  s.extra_p95_ms = ms(s.checked_p95_ms - s.plain_p95_ms);
  check(times.length === 2 * N, `speed: ${times.length} timings of ${2 * N}`);
  check(live(biz) === 6 * N, `speed: ${live(biz)} bookings after the timed run, expected ${6 * N} (a timed insert was refused)`);
  // R4 as Andrew set it 2026-10-17 23:11: the lock adds no more than 5 ms per booking. Held at the median AND
  // at the 95th percentile, so the slow end of the run is held to it too.
  check(s.extra_median_ms <= R4_MS, `speed (R4): the checked save's median is ${s.extra_median_ms} ms longer than the plain insert's, over the ${R4_MS} ms rule`);
  check(s.extra_p95_ms <= R4_MS, `speed (R4): the checked save's 95th percentile is ${s.extra_p95_ms} ms longer than the plain insert's, over the ${R4_MS} ms rule`);
  done("speed", s);
}

const EXPECTED = 10;
const LOG = `artifacts/booking-day-lock/run${BREAK ? "." + BREAK : ""}.json`;
mkdirSync(join(REPO, "artifacts/booking-day-lock"), { recursive: true });
writeFileSync(join(REPO, LOG), JSON.stringify({ postgres: version, break: BREAK || null, cases, failures }, null, 1));
const defect = cases.filter((c) => c.id.startsWith("defect-")).every((c) => c.a_exit === 0 && c.b_exit === 0);
const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  // One receipt per sabotage (receipts/booking-day-lock.<break>.sabotage.json), so neither overwrites the other.
  check_id: BREAK ? `booking-day-lock.${BREAK}` : "booking-day-lock",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: EXPECTED,
  discovered_targets: cases.length,
  attempted_targets: cases.length,
  completed_targets: cases.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 29,
  assertion_floor: "4 real schema, 1+1 defect, 4 cap race, 3 buffer race, 3 move race, 2 ordinary, 1 fence, 6 real payload, 4 speed; every check() unconditional.",
  failures,
  warnings: [
    `Throwaway local Postgres built by replaying all ${FILES.length} files in supabase/migrations/; Supabase's own auth, storage, vault, cron and net schemas, its roles and its default grants are stand-ins, and the pg_cron / pg_net extension lines are skipped.`,
    "Does not run the edge functions (no Deno here, and they are not deployed) or touch the live database; applying the migration is Andrew's.",
  ],
  artifacts: [LOG],
  canary: { id: "plain-insert-beats-cap-and-buffer", observed_failure: defect },
  dimensions: { break: BREAK || undefined, item: "97.18", postgres: version, migrations_replayed: replayed, r4_ms: R4_MS },
  observed: Object.fromEntries(cases.map((c) => [c.id, c])),
});
console.log(`receipt: ${path}\n${status.toUpperCase()} — ${cases.length} of ${EXPECTED} cases, ${assertions} assertions, ${failures.length} failed`);
for (const f of failures) console.log(`  FAIL ${f}`);
process.exit(failures.length ? 1 : 0);
