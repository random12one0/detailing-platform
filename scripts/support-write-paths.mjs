// ROADMAP 4.3a — EVERY WRITE PATH A READ-ONLY SUPPORT SESSION MUST BE REFUSED ON,
// DISCOVERED RATHER THAN LISTED BY HAND.
//
//   node scripts/support-write-paths.mjs
//   node scripts/support-write-paths.mjs --break=blind-definer   # sabotage
//
// A support session is the owner's own identity (`auth.uid()` is the owner's),
// so it can reach exactly what the owner can. 4.3c has to put a refusal on each
// of four layers, and the design document's own warning was that nobody had
// listed them. This asks the LIVE catalog (read-only) for the first three and
// reads the repo for the fourth:
//
//   A. Data API tables — `authenticated` holds the privilege AND a permissive
//      policy for that command applies to it (or RLS is off).
//   B. storage.objects — every write policy open to `authenticated`/`public`.
//   C. security-definer functions `authenticated` may EXECUTE whose own body
//      writes. They skip row rules, so each needs its own check.
//   D. edge functions that authenticate a USER (requireMember / getUser) and
//      write. They run as the service role and skip row rules.
//
// ponytail: C and D classify by a regex over source text. A definer function
// that writes only by calling ANOTHER function, or an edge function that writes
// only inside a `_shared` helper, is missed — so C lists the non-writing ones by
// name too, and D lists every user-authenticated function whatever its verbs.
// Upgrade path: follow calls, if 4.3c's proof turns up a write this missed.
//
// CANARY: the two classifiers are handed a body that writes and one that does
// not, and must tell them apart. `--break=blind-definer` makes the C classifier
// see nothing, which is the original defect — "nobody listed which ones write"
// — and must turn the run red.

import "../tests/_env.mjs";
import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const REF = "kguqylyzgyzfktkfnhjb";
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN) throw new Error("Missing SUPABASE_ACCESS_TOKEN in .env");
if (!String(process.env.SUPABASE_URL).includes(REF)) throw new Error(`Refusing: SUPABASE_URL is not project ${REF}`);
const started_at = new Date().toISOString();

const sql = async (query) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, read_only: true }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`catalog query failed: ${r.status} ${JSON.stringify(j).slice(0, 200)}`);
  return j;
};

// THE TWO CLASSIFIERS — used by the layers and by the canary alike.
const SQL_WRITE = /\b(insert\s+into|update\s+[\w."]+\s+(?:as\s+\w+\s+)?set|delete\s+from|merge\s+into)\b/i;
export const sqlWrites = (body) => (BREAK === "blind-definer" ? false : SQL_WRITE.test(String(body).replace(/--[^\n]*/g, "")));
const TS_WRITE = /\.(insert|update|upsert|delete|upload|remove)\(|\.rpc\(/g;
export const tsWrites = (src) => [...new Set([...String(src).replace(/^\s*\/\/[^\n]*/gm, "").matchAll(TS_WRITE)].map((m) => m[1] || "rpc"))];

const canary = {
  id: "classifiers-tell-a-write-from-a-read",
  observed_failure:
    sqlWrites("begin update public.bookings set status = 'x' where id = $1; end") && !sqlWrites("select 1 -- update x set y")
    && tsWrites('await supabase.from("x").update({a:1})').includes("update") && tsWrites('supabase.from("x").select("*")').length === 0,
};
canary.detail = canary.observed_failure ? "write bodies classified as writes, read bodies as reads" : "a classifier could not tell a write from a read";

// A. Data API tables.
const tables = await sql(`
  select c.relname t, c.relrowsecurity rls, cmd.c,
    case cmd.c when 'DELETE' then has_table_privilege('authenticated', c.oid, 'DELETE')
               else has_any_column_privilege('authenticated', c.oid, cmd.c) end granted,
    exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname
            and p.permissive = 'PERMISSIVE' and p.cmd in (cmd.c, 'ALL')
            and (p.roles && array['authenticated','public']::name[])) allowed
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  cross join (values ('INSERT'), ('UPDATE'), ('DELETE')) cmd(c)
  where n.nspname = 'public' and c.relkind in ('r','p') order by 1, 3`);
const tableNames = new Set(tables.map((r) => r.t));
const reach = {};
for (const r of tables) if (r.granted && (r.allowed || !r.rls)) (reach[r.t] ||= []).push(r.c);
const layerA = Object.entries(reach).map(([t, cmds]) => ({ table: t, commands: cmds }));
const grantedNoPolicy = tables.filter((r) => r.granted && r.rls && !r.allowed).map((r) => `${r.t}:${r.c}`);

// B. storage.objects.
const layerB = await sql(`
  select policyname, cmd, roles::text roles from pg_policies
  where schemaname = 'storage' and tablename = 'objects' and cmd in ('INSERT','UPDATE','DELETE','ALL')
    and (roles && array['authenticated','public']::name[]) order by 1`);

// C. security-definer functions.
const defs = await sql(`
  select p.proname name, pg_get_function_identity_arguments(p.oid) args, p.prosrc src,
    has_function_privilege('anon', p.oid, 'EXECUTE') anon
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef and p.prorettype <> 'trigger'::regtype
    and has_function_privilege('authenticated', p.oid, 'EXECUTE') order by 1`);
const layerC = defs.filter((f) => sqlWrites(f.src)).map((f) => ({ fn: `${f.name}(${f.args})`, anon_too: f.anon }));
const definerReads = defs.filter((f) => !sqlWrites(f.src)).map((f) => `${f.name}(${f.args})`);

// D. edge functions.
const FN = join(REPO, "supabase", "functions");
const layerD = [], edgeUnauthed = [];
for (const name of readdirSync(FN).filter((d) => !d.startsWith("_") && existsSync(join(FN, d, "index.ts"))).sort()) {
  // Comments out first: track-visit's header says "no `requireMember`" and was counted as calling it.
  const src = readdirSync(join(FN, name)).filter((f) => f.endsWith(".ts")).map((f) => readFileSync(join(FN, name, f), "utf8")).join("\n")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*/gm, "");
  // `\b`, not `requireMember(`: photo-door hands it over by reference (`deps.requireMember`).
  const gate = /\brequireMember\b/.test(src) ? "requireMember" : /\bgetUser\(/.test(src) ? "getUser" : null;
  const verbs = tsWrites(src);
  if (gate) layerD.push({ fn: name, gate, writes: verbs });
  else edgeUnauthed.push(name);
}

// Discovery floors: each layer existed when this was written; zero means the instrument broke.
const layers = [
  ["A-data-api-tables", layerA.length, 20],
  ["B-storage-objects", layerB.length, 1],
  ["C-definer-functions-that-write", layerC.length, 1],
  ["D-edge-functions-with-a-user", layerD.length, 10],
];
const failures = layers.filter(([, n, floor]) => n < floor).map(([id, n, floor]) => `${id}: found ${n}, floor ${floor}`);
if (!tableNames.size) failures.push("catalog returned no public tables");

console.log(`  A  ${layerA.length} tables a signed-in user can write through the Data API`);
for (const r of layerA) console.log(`       ${r.table}: ${r.commands.join(" ")}`);
if (grantedNoPolicy.length) console.log(`     (granted but no policy, so refused today: ${grantedNoPolicy.join(", ")})`);
console.log(`  B  ${layerB.length} storage.objects write policies`);
for (const p of layerB) console.log(`       ${p.cmd} ${p.policyname} ${p.roles}`);
console.log(`  C  ${layerC.length} of ${defs.length} definer functions callable by a signed-in user write`);
for (const f of layerC) console.log(`       ${f.fn}${f.anon_too ? "  (anon may call it too)" : ""}`);
console.log(`     reads only, by their own body: ${definerReads.join(", ")}`);
console.log(`  D  ${layerD.length} edge functions authenticate a user (${edgeUnauthed.length} do not)`);
for (const f of layerD) console.log(`       ${f.fn} [${f.gate}] writes: ${f.writes.join(" ") || "none in its own files"}`);
console.log(`  canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);

const artifact = "receipts/support-write-paths.list" + (BREAK ? "." + BREAK + ".sabotage" : "") + ".json";
writeFileSync(artifact, JSON.stringify({ project: REF, layerA, grantedNoPolicy, layerB, layerC, definerReads, layerD, edgeUnauthed }, null, 2) + "\n");
const { path } = writeReceipt({
  check_id: "support-write-paths",
  started_at,
  status: failures.length || !canary.observed_failure ? "fail" : "pass",
  expected_targets: layers.length,
  discovered_targets: layers.length,
  attempted_targets: layers.length,
  completed_targets: layers.length,
  skipped_targets: 0,
  assertions_executed: layers.length,
  min_assertions: layers.length,
  assertion_floor: "four fixed layers, one discovery-floor assertion each; the layer count is set by the code",
  failures,
  canary,
  artifacts: [artifact],
  dimensions: { ...(BREAK ? { break: BREAK } : {}), A: layerA.length, B: layerB.length, C: layerC.length, D: layerD.length },
});
console.log(`\n  ${failures.length ? "FAIL" : "PASS"} -> ${path}`);
process.exitCode = failures.length || !canary.observed_failure ? 1 : 0;
