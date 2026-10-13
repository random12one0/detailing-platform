// ROADMAP 6.1b — RESTORE ONE NIGHTLY BACKUP INTO A THROWAWAY POSTGRES ON THIS
// MACHINE, AND CHECK IT AGAINST THE BACKUP'S OWN CONTENTS.
//
//   node scripts/restore-nightly.mjs --fixture                  # self-test, no key needed
//   node scripts/restore-nightly.mjs --release=latest           # Andrew: a real nightly
//   node scripts/restore-nightly.mjs --release=backup-2026-10-13
//   node scripts/restore-nightly.mjs --dump=<file.pgc | file.pgc.age>
//   node scripts/receipt.mjs receipts/restore-nightly.json
//
// Sabotage: --break=lose-table (bookings' rows are left out of the restore —
// the original defect, a copy that does not all come back; must go red) and
// --break=canary (the planted change is skipped; the receipt must refuse).
//
// WHY THIS EXISTS. `restore-drill.mjs` proves a logical round trip by creating
// a schema INSIDE the live database, and it never opens the nightly copies in
// `random12one0/detailing-platform-backups`. Those copies are what a bad day
// would use, and nobody had restored one. This restores one OUTSIDE Supabase.
//
// WHERE IT RESTORES. A brand-new Postgres 17 cluster in a temporary folder,
// on a random local port, trust login on localhost only, started for this run
// and stopped and deleted at the end (also on Ctrl-C). Nothing on Supabase is
// read or written, except the one restore date below. The program files are
// the official portable Windows zip and `age`, unzipped (no installer, no
// admin) into %LOCALAPPDATA%\detailing-platform\tools — see docs/recovery.md.
//
// THE KEY. A real nightly is `age`-encrypted. The private key is Andrew's and
// this script never reads it: `age.exe` is handed its PATH (AGE_KEY_FILE, or
// ~/.config/detailing-backup/age-key.txt, the same place the backups repo's
// restore.sh looks). With no key file it refuses before downloading anything.
// The decrypted copy lives only in the temporary folder and is deleted with it.
//
// WHAT "CAME BACK" MEANS. `pg_restore --data-only -f` turns the backup into
// plain text WITHOUT a database; every `COPY` block in it is what that table
// held the night it was taken. Each table in `public`, `auth` and `storage`
// is then read back out of the restored database with the same column list,
// and the two are compared by row count and by a hash of the sorted rows.
// Bookings, customers, business settings, logins (`auth.users`) and stored
// file records (`storage.objects`) must each be present. The file BYTES are
// not in a database backup at all (docs/ops/backups.md § 2), so "storage files"
// here are their records; that limit is printed in every receipt.
//
// Supabase-only add-ons (scheduled jobs, vault, pg_net, GraphQL) cannot load
// into plain Postgres. Errors restoring anything OUTSIDE those three schemas
// are listed by name as warnings; errors inside them are failures.
//
// THE CANARY. After a clean comparison, one text value in one restored
// booking is altered and bookings is compared again. It must be named.
//
// THE DATE. A real nightly that proves out writes the `restore-drill` row of
// `job_heartbeats` through `restore-date.mjs` (needs `.env` loaded); the back
// office reads that row. A --fixture run is marked as such and can never
// write it — `whyNotProved` refuses any project but the platform's.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import net from "node:net";
import os from "node:os";
import { join, basename } from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";
import { whyNotProved, recordRestore, PROJECT } from "./restore-date.mjs";

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3) || null;
const BREAK = arg("break") || "";
const FIXTURE = process.argv.includes("--fixture");
const RELEASE = arg("release");
const DUMP = arg("dump");
const BACKUPS_REPO = "random12one0/detailing-platform-backups";
const KEY = process.env.AGE_KEY_FILE || join(os.homedir(), ".config", "detailing-backup", "age-key.txt");
const TOOLS = process.env.RESTORE_TOOLS || join(process.env.LOCALAPPDATA || os.homedir(), "detailing-platform", "tools");
const PG = (n) => join(TOOLS, "pgsql", "bin", n + ".exe");
const AGE = join(TOOLS, "age", "age.exe");
const SCHEMAS = ["public", "auth", "storage"];
const MUST_HAVE = ["public.bookings", "public.customers", "public.businesses", "public.business_settings", "auth.users", "storage.objects"];
const CANARY_TABLE = "public.bookings";

const refuse = (msg) => { console.error(`REFUSED — ${msg}\nNothing was restored and no date was recorded.`); process.exit(2); };
if ([FIXTURE, !!RELEASE, !!DUMP].filter(Boolean).length !== 1) refuse("say exactly one of --fixture, --release=<tag|latest>, --dump=<file>");
for (const n of ["initdb", "pg_ctl", "pg_dump", "pg_restore", "psql"]) {
  if (!existsSync(PG(n))) refuse(`${n}.exe is not at ${PG(n)}. docs/recovery.md says how to unzip the Postgres 17 tools there.`);
}
const encrypted = !!RELEASE || /\.age$/i.test(DUMP || "");
if (encrypted && !existsSync(AGE)) refuse(`age.exe is not at ${AGE}.`);
if (encrypted && !existsSync(KEY)) refuse(`no backup key file at ${KEY} (or wherever AGE_KEY_FILE points). Only Andrew can put it there.`);

function run(exe, args, { input, ok = [0] } = {}) {
  const r = spawnSync(exe, args, { input, encoding: "utf8", maxBuffer: 1 << 30, windowsHide: true });
  if (r.error) throw r.error;
  if (!ok.includes(r.status)) throw new Error(`${basename(exe)} ${args.slice(0, 3).join(" ")} … exited ${r.status}: ${(r.stderr || "").slice(0, 600)}`);
  return r;
}

// ---- the throwaway cluster ------------------------------------------------
const TMP = mkdtempSync(join(os.tmpdir(), "restore-nightly-"));
const DATA = join(TMP, "data");
let started = false;
function teardown() {
  if (started) { spawnSync(PG("pg_ctl"), ["-D", DATA, "-m", "immediate", "-w", "stop"], { windowsHide: true }); started = false; }
  rmSync(TMP, { recursive: true, force: true });
}
process.on("exit", teardown);
for (const s of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(s, () => process.exit(130));

const port = await new Promise((res) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); }); });
const CONN = ["-h", "127.0.0.1", "-p", String(port), "-U", "postgres"];
const sql = (db, q) => run(PG("psql"), ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", ...CONN, "-d", db], { input: q }).stdout;

run(PG("initdb"), ["-D", DATA, "-U", "postgres", "-A", "trust", "-E", "UTF8", "--locale=C"]);
// stdio ignored: the server inherits pg_ctl's pipes and keeps them open, so a
// piped spawnSync never returns (measured: the first run hung here with the server up).
const st = spawnSync(PG("pg_ctl"), ["-D", DATA, "-l", join(TMP, "server.log"), "-w", "-o", `-p ${port} -c listen_addresses=127.0.0.1`, "start"], { stdio: "ignore", windowsHide: true });
started = true;
if (st.status !== 0) throw new Error(`pg_ctl start exited ${st.status}; see ${join(TMP, "server.log")}`);
console.log(`throwaway Postgres ${sql("postgres", "show server_version").trim()} on 127.0.0.1:${port}, folder ${TMP}`);

// Supabase's roles, so security rules naming them restore. --no-owner and
// --no-privileges mean nothing else about a role is in the backup.
const ROLES = ["anon", "authenticated", "service_role", "authenticator", "supabase_admin", "supabase_auth_admin",
  "supabase_storage_admin", "supabase_functions_admin", "supabase_realtime_admin", "supabase_replication_admin",
  "supabase_read_only_user", "dashboard_user", "pgbouncer"];
const roleSql = ROLES.map((r) => `do $$ begin create role ${r} nologin; exception when duplicate_object then null; end $$;`).join("\n");
sql("postgres", roleSql + "\ncreate database restored;");

// ---- the copy to restore ----------------------------------------------------
let dumpFile, source, project;
if (FIXTURE) {
  sql("postgres", "create database source;");
  sql("source", readFileSync(new URL("./restore-nightly.fixture.sql", import.meta.url), "utf8"));
  dumpFile = join(TMP, "fixture.pgc");
  // The nightly's own flags (docs/ops/backups.md): custom format, no owners, no grants.
  run(PG("pg_dump"), [...CONN, "-d", "source", "--no-owner", "--no-privileges", "--format=custom", "-f", dumpFile]);
  source = "fixture (scripts/restore-nightly.fixture.sql, dumped by pg_dump with the nightly's flags)";
  project = "fixture";
} else {
  let enc = DUMP;
  if (RELEASE) {
    const tag = RELEASE === "latest"
      ? run("gh", ["release", "list", "-R", BACKUPS_REPO, "--limit", "1", "--json", "tagName", "--jq", ".[0].tagName"]).stdout.trim()
      : RELEASE;
    run("gh", ["release", "download", tag, "-R", BACKUPS_REPO, "--dir", TMP, "--pattern", "*.pgc.age"]);
    enc = join(TMP, readdirSync(TMP).find((f) => f.endsWith(".pgc.age")) || refuse(`release ${tag} has no .pgc.age file`));
    source = `${BACKUPS_REPO} release ${tag}`;
  } else source = `file ${basename(DUMP)}`;
  if (encrypted) {
    dumpFile = join(TMP, "dump.pgc");
    run(AGE, ["-d", "-i", KEY, "-o", dumpFile, enc]); // age reads the key; this script never does
  } else dumpFile = DUMP;
  source += `, ${statSync(enc).size} bytes${encrypted ? " encrypted" : ""}`;
  project = PROJECT;
}
console.log(`restoring: ${source}`);

// ---- what the backup itself says each table held ---------------------------
const toc = run(PG("pg_restore"), ["-l", dumpFile]).stdout;
const tocTables = toc.split(/\r?\n/).map((l) => l.match(/^\d+; \d+ \d+ TABLE (\S+) (\S+) /)).filter(Boolean)
  .map((m) => `${m[1]}.${m[2]}`).filter((t) => SCHEMAS.includes(t.split(".")[0]));
const plain = run(PG("pg_restore"), ["--data-only", "-f", "-", dumpFile]).stdout;
const expected = new Map(); // table -> { cols, rows[] }
{
  let cur = null;
  // Windows tools end lines with CRLF (measured: the first run parsed 0 tables);
  // COPY escapes a real carriage return in data as \r, so stripping one is safe.
  for (const line of plain.split(/\r?\n/)) {
    if (cur) { if (line === "\\.") cur = null; else cur.rows.push(line); continue; }
    const m = line.match(/^COPY (.+?) \((.*)\) FROM stdin;$/);
    if (m) { cur = { cols: m[2], rows: [] }; expected.set(m[1].replace(/"/g, ""), cur); }
  }
}
const inScope = [...expected.keys()].filter((t) => SCHEMAS.includes(t.split(".")[0])).sort();

// ---- restore ----------------------------------------------------------------
let restoreArgs = ["--no-owner", "--no-privileges", ...CONN, "-d", "restored"];
if (BREAK === "lose-table") {
  const listFile = join(TMP, "list.txt");
  writeFileSync(listFile, toc.split(/\r?\n/).map((l) => (/ TABLE DATA public bookings /.test(l) ? ";" + l : l)).join("\n"));
  restoreArgs = ["-L", listFile, ...restoreArgs];
}
const rr = run(PG("pg_restore"), [...restoreArgs, dumpFile], { ok: [0, 1] });
const failures = [], warnings = [];
for (const block of (rr.stderr || "").split(/(?=pg_restore: from TOC entry)/)) {
  const m = block.match(/^pg_restore: from TOC entry \d+; \d+ \d+ (.+?) (\S+) (\S+) \S+\s*\npg_restore: error: (?:could not execute query: )?(.*)/);
  if (!m) { if (/error/i.test(block) && !/errors ignored on restore/.test(block)) warnings.push(`pg_restore: ${block.trim().slice(0, 200)}`); continue; }
  const [, kind, schema, name, err] = m;
  const line = `${kind} ${schema}.${name} did not restore: ${err.trim().slice(0, 160)}`;
  (SCHEMAS.includes(schema) ? failures : warnings).push(line);
}

// ---- compare ------------------------------------------------------------------
const digest = (rows) => createHash("sha256").update([...rows].sort().join("\n")).digest("hex");
function compare(table) {
  const e = expected.get(table);
  let got;
  try {
    const out = sql("restored", `copy (select ${e.cols} from ${table}) to stdout;`);
    got = out === "" ? [] : out.replace(/\r?\n$/, "").split(/\r?\n/);
  } catch (err) { return { table, ok: false, why: `did not come back (${String(err.message).split("\n").find((l) => /ERROR/.test(l)) || "unreadable"})` }; }
  if (got.length !== e.rows.length) return { table, ok: false, why: `${got.length} rows, the backup holds ${e.rows.length}` };
  if (digest(got) !== digest(e.rows)) return { table, ok: false, why: `${got.length} rows, but their contents differ from the backup` };
  return { table, ok: true, rows: got.length };
}
let assertions = 0;
const results = inScope.map(compare);
for (const r of results) { assertions++; if (!r.ok) failures.push(`restore mismatch — ${r.table}: ${r.why}`); }
for (const t of MUST_HAVE) { assertions++; if (!expected.has(t)) failures.push(`${t} is not in the backup at all`); }
assertions++;
const missingData = tocTables.filter((t) => !expected.has(t));
if (missingData.length) failures.push(`${missingData.length} table(s) in the backup's index have no rows section: ${missingData.join(", ")}`);
const others = [...expected.keys()].filter((t) => !SCHEMAS.includes(t.split(".")[0]));
if (others.length) warnings.push(`${others.length} table(s) outside public/auth/storage (Supabase add-ons) not compared: ${others.join(", ")}`);
warnings.push("STORAGE FILE BYTES ARE NOT IN A DATABASE BACKUP. storage.objects rows (the file records) are compared; the photos themselves are not in these copies (docs/ops/backups.md).");

// ---- the canary ---------------------------------------------------------------
let canary = { id: "altered-booking-text", observed_failure: false, note: "" };
if (BREAK !== "canary" && expected.has(CANARY_TABLE)) {
  // A bookings table that did not come back has nothing to alter; that must
  // reach the receipt as a missed canary, not crash the run (measured with
  // --break=lose-table: it threw here and wrote no receipt at all).
  try { sql("restored", `do $$ declare c text; n int; begin
    for c in select column_name from information_schema.columns where table_schema='public' and table_name='bookings'
               and data_type in ('text','character varying') order by ordinal_position loop
      begin
        execute format('update public.bookings set %I = %I || ''~canary'' where ctid = (select ctid from public.bookings where %I is not null limit 1)', c, c, c);
        get diagnostics n = row_count;
        if n = 1 then raise notice 'CANARY %', c; return; end if;
      exception when others then null; end;
    end loop; raise exception 'no text value in public.bookings to alter'; end $$;`);
    const after = compare(CANARY_TABLE);
    canary = { id: "altered-booking-text", observed_failure: !after.ok, note: after.ok ? "an altered booking compared clean — the comparison is blind" : `named: ${after.table}: ${after.why}` };
  } catch (e) { canary.note = `could not plant: ${String(e.message).split("\n").find((l) => /ERROR/.test(l)) || e.message}`; }
  assertions++;
} else canary.note = BREAK === "canary" ? "skipped on purpose (--break=canary)" : `${CANARY_TABLE} not in the backup`;

const counts = Object.fromEntries(results.filter((r) => r.ok && MUST_HAVE.includes(r.table)).map((r) => [r.table, r.rows]));
const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
// The thing a person can look at: per table, rows and a hash, never a value
// (artifacts/ is git-ignored; this holds no customer data either way).
const REPORT = "artifacts/restore-nightly/report.txt";
mkdirSync(join(REPO, "artifacts", "restore-nightly"), { recursive: true });
writeFileSync(join(REPO, REPORT), [`restore-nightly ${started_at} — ${source}`, `status ${status}`,
  ...results.map((r) => `${r.ok ? "ok  " : "FAIL"} ${r.table} ${r.ok ? `${r.rows} rows sha256 ${digest(expected.get(r.table).rows)}` : r.why}`),
  ...failures.map((f) => `FAILURE ${f}`), `canary ${canary.observed_failure ? "caught" : "MISSED"}: ${canary.note}`].join("\n") + "\n");
const { path: receiptPath, receipt } = writeReceipt({
  check_id: "restore-nightly",
  started_at,
  status,
  expected_targets: tocTables.length,     // the backup's index
  discovered_targets: inScope.length,     // the backup's rows sections
  attempted_targets: inScope.length,
  completed_targets: results.length,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: MUST_HAVE.length + 3,
  failures,
  warnings: [...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []), ...warnings],
  dimensions: {
    project, source, target: "throwaway local Postgres, deleted after the run", break: BREAK || undefined,
    accounts: counts["auth.users"] ?? null, files: counts["storage.objects"] ?? null, rows: counts,
  },
  artifacts: [REPORT],
  canary,
});

for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.table.padEnd(42)} ${r.ok ? r.rows + " rows" : r.why}`);
for (const w of warnings) console.log(`  note: ${w}`);
for (const f of failures) console.log(`  FAILURE: ${f}`);
console.log(`canary: ${canary.observed_failure ? "caught" : "MISSED"} — ${canary.note}`);
console.log(`${status.toUpperCase()}: ${results.filter((r) => r.ok).length} of ${inScope.length} tables came back identical (the backup's index lists ${tocTables.length}). Receipt ${receiptPath}`);

// ---- the date the back office shows ------------------------------------------
const no = whyNotProved(receipt);
if (no.length) console.log(`restore date NOT recorded: ${no.join("; ")}`);
else if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) console.log("restore PROVED, but .env is not loaded, so the date was NOT recorded. Load it and run again.");
else if (!process.env.SUPABASE_URL.includes(PROJECT)) console.log(`SUPABASE_URL is not ${PROJECT}; date NOT recorded.`);
else { const got = await recordRestore(receipt, process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); console.log(`restore date recorded: job_heartbeats.${got.job} ${got.ran_at}`); }
process.exit(status === "pass" ? 0 : 1);
