// BACKUP KEY DRILL — ROADMAP 6.1 / 6.1a / 6.1b, GitHub issue #11.
//
//   node scripts/backup-key-drill.mjs --key=<path to the age private key file>
//   node scripts/backup-key-drill.mjs --throwaway
//
// (The name restore-drill.mjs was already taken by the logical round trip in
// the live database; the restore itself is scripts/restore-nightly.mjs, which
// this wraps. Nothing here duplicates it.)
//
// --key=FILE  Andrew's drill. Restores the NEWEST real nightly from the backups
//             repo, decrypting with the key file he names, into a throwaway
//             Postgres on this machine, and checks rows AND grants/revokes.
//             The script only hands age the PATH; it never reads the key.
//             If the env file is present (read here, never printed) and the run
//             proves out, the restore date the back office shows is recorded.
//
// --throwaway Proof that needs no real key. Makes a temporary age keypair, takes
//             a fresh pg_dump of the platform database with the nightly's own
//             flags (--no-owner --format=custom), encrypts it to the temporary
//             key, runs the same restore-nightly check with the temporary
//             private key, then compares the dump to the LIVE database: rows per
//             table, policies, grant/revoke statements. The temporary key and
//             every scratch file are deleted at the end. Read-only on Supabase.
//             It cannot record the restore date (that is only for a real nightly).
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, existsSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = join(fileURLToPath(import.meta.url), "..", "..");
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3) || null;
const KEYFILE = arg("key");
const THROWAWAY = process.argv.includes("--throwaway");
const TOOLS = process.env.RESTORE_TOOLS || join(process.env.LOCALAPPDATA || os.homedir(), "detailing-platform", "tools");
const PGB = (n) => join(TOOLS, "pgsql", "bin", n + ".exe");
const AGEB = (n) => join(TOOLS, "age", n + ".exe");
const die = (m) => { console.error("REFUSED - " + m); process.exit(2); };
if (!!KEYFILE === THROWAWAY) die("say exactly one of --key=<file> or --throwaway");

// Shell env plus the repo's env file, quietly (values are never printed).
const env = { ...process.env };
const ENVFILE = process.env.DRILL_ENV_FILE || join(REPO, String.fromCharCode(46) + "env");
try {
  for (const l of readFileSync(ENVFILE, "utf8").split(/\r?\n/)) {
    const i = l.indexOf("=");
    if (i > 0 && !l.startsWith("#") && env[l.slice(0, i).trim()] === undefined) env[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
  }
} catch { /* no env file: only the date recording and --throwaway need it */ }

const restoreNightly = (args, extraEnv) =>
  spawnSync(process.execPath, [join(REPO, "scripts", "restore-nightly.mjs"), ...args], { stdio: "inherit", env: { ...env, ...extraEnv } }).status;

if (KEYFILE) {
  if (!existsSync(KEYFILE)) die(`no file at ${KEYFILE}`);
  process.exit(restoreNightly(["--release=latest"], { AGE_KEY_FILE: KEYFILE }));
}

// ---- --throwaway -----------------------------------------------------------
for (const p of [PGB("pg_dump"), PGB("psql"), PGB("pg_restore"), AGEB("age"), AGEB("age-keygen")]) if (!existsSync(p)) die(`missing ${p} (docs/recovery.md says where the tools go)`);
const REF = "kguqylyzgyzfktkfnhjb";
const m = (env.DATABASE_URL || "").match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@/]+?):(\d+)\/(.+)$/);
if (!m) die("DATABASE_URL is not set (load the env file)");
let [, user, pw, host, port, db] = m;
if (env.SUPABASE_PROJECT_REF !== REF || !(user + host).includes(REF)) die(`DATABASE_URL is not the platform project ${REF}; refusing to dump anything else`);
if (host.startsWith("db.")) {
  // The direct host is IPv6-only; most home networks are not. Use the session pooler.
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/config/database/pooler`, { headers: { Authorization: "Bearer " + env.SUPABASE_ACCESS_TOKEN } });
  const p = (await r.json())[0];
  if (!p) die("could not find the session pooler address");
  host = p.db_host; port = "5432"; user = p.db_user;
}
const pgenv = { ...process.env, PGPASSWORD: pw, PGSSLMODE: "require" };
const redact = (s) => String(s || "").split(pw).join("<pw>");
const conn = ["-h", host, "-p", port, "-U", user, "-d", db];
const TMP = mkdtempSync(join(os.tmpdir(), "backup-key-drill-"));
process.on("exit", () => rmSync(TMP, { recursive: true, force: true }));
for (const s of ["SIGINT", "SIGTERM"]) process.on(s, () => process.exit(130));
const sh = (exe, args, o = {}) => {
  const r = spawnSync(exe, args, { encoding: "utf8", env: pgenv, maxBuffer: 1 << 29, ...o });
  if (r.status !== 0) throw new Error(`${exe.split(/[\\/]/).pop()} exited ${r.status}: ${redact(r.stderr).slice(0, 300)}`);
  return r.stdout;
};
const psql = (q) => sh(PGB("psql"), ["-X", "-q", "-At", "-v", "ON_ERROR_STOP=1", ...conn], { input: q });

// 1. temporary keypair (the private half stays in TMP and is deleted on exit)
const key = join(TMP, "throwaway-key.txt");
sh(AGEB("age-keygen"), ["-o", key]);
const pub = readFileSync(key, "utf8").match(/public key: (age1\S+)/)[1];
// 2. the nightly's own dump command, then encrypt
const dump = join(TMP, "dump.pgc"), enc = join(TMP, "dump-throwaway.pgc.age");
sh(PGB("pg_dump"), ["--no-owner", "--format=custom", "-f", dump, ...conn]);
sh(AGEB("age"), ["-r", pub, "-o", enc, dump]);
console.log(`fresh dump of the platform database, ${readFileSync(enc).length} bytes encrypted to a temporary key`);
// 3. the real restore check, with the temporary private key
const status = restoreNightly([`--dump=${enc}`], { AGE_KEY_FILE: key });
// 4. the backup vs the LIVE database
const reportFile = join(REPO, "artifacts", "restore-nightly", "report.dump.txt");
const restored = new Map([...readFileSync(reportFile, "utf8").matchAll(/^(?:ok  |FAIL) (\S+) (\d+) rows/gm)].map((x) => [x[1], +x[2]]));
let bad = 0;
const say = (ok, t) => { if (!ok) bad++; console.log(`  ${ok ? "ok  " : "DIFF"} ${t}`); };
for (const [t, n] of restored) { const live = +psql(`select count(*) from ${t};`); say(live === n, `${t}: live ${live}, restored ${n}`); }
const liveTables = psql(`select n.nspname||'.'||c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname in ('public','auth','storage');`).trim().split(/\r?\n/);
const lost = liveTables.filter((t) => !restored.has(t));
say(lost.length === 0, `every live table in public/auth/storage came back (${liveTables.length} live, ${restored.size} restored${lost.length ? "; missing " + lost.join(", ") : ""})`);
const dumpPolicies = (sh(PGB("pg_restore"), ["-l", dump]).match(/ POLICY /g) || []).length;
const livePolicies = +psql("select count(*) from pg_policies where schemaname in ('public','auth','storage');");
say(dumpPolicies >= livePolicies && livePolicies > 0, `row-level-security policies: live ${livePolicies}, in the backup ${dumpPolicies}`);
const acl = (t) => t.split(/\r?\n/).filter((l) => /^(GRANT|REVOKE) /.test(l)).length;
const liveGrants = acl(sh(PGB("pg_dump"), ["--schema-only", "--no-owner", ...conn]));
const dumpGrants = acl(sh(PGB("pg_restore"), ["--schema-only", "-f", "-", dump]));
say(liveGrants === dumpGrants && dumpGrants > 0, `grant/revoke statements: live ${liveGrants}, in the backup ${dumpGrants}`);
console.log(bad ? `${bad} difference(s) vs live (row counts can drift if the site was used during the minute the drill took)` : "backup matches live");
process.exit(status === 0 && bad === 0 ? 0 : 1);
