// Is what is RUNNING what is in the repo?
//
// A function whose deploy never happened looks exactly like one that
// deployed: the code is in git, the tests that read the source pass, and the
// only thing that is wrong is the copy answering real requests. This repo's
// standing complaint — "a skipped check reads exactly like a passing one" —
// with the gap moved from the test suite to the gateway.
//
// HOW IT DECIDES, and why it is git rather than mtimes: a working-tree mtime
// changes when a branch is checked out, so it would call every function stale
// after any switch. The question asked here is **was this function deployed
// AFTER the last commit that changed anything it is built from** — its own
// directory, plus every `_shared` module it imports, which the deploy script
// bundles into it. Those are the only files that can change what it runs.
//
// It reads. It deploys nothing and it writes nothing.
//
// Usage: node scripts/check-deployed.mjs
// Env:   SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF  (root .env is loaded)

import { execFileSync } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const FUNCTIONS = path.join(ROOT, "supabase", "functions");

// The root .env, same shape every other script here reads.
const envFile = path.join(ROOT, ".env");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
}

const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } = process.env;
if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF");
  process.exit(1);
}

// Last commit touching any of these paths, as a unix timestamp. `--` guards
// against a path that also looks like a revision.
function lastCommit(paths) {
  const out = execFileSync("git", ["log", "-1", "--format=%ct", "--", ...paths],
    { cwd: ROOT, encoding: "utf8" }).trim();
  return out ? Number(out) * 1000 : 0;
}

// Which _shared modules end up inside this function's bundle. One level is
// enough only if _shared modules do not import each other, so this follows
// them: a stale `brandColor.js` reached through `email.ts` is exactly the
// kind of thing that would otherwise be missed.
async function sharedFor(fn, seen = new Set()) {
  const dir = path.join(FUNCTIONS, fn);
  const stack = [];
  for (const f of await readdir(dir, { recursive: true, withFileTypes: true })) {
    if (f.isFile()) stack.push(path.join(f.parentPath ?? f.path, f.name));
  }
  while (stack.length) {
    const file = stack.pop();
    let src;
    try { src = await readFile(file, "utf8"); } catch { continue; }
    for (const m of src.matchAll(/["'](?:\.\.\/)+_shared\/([\w./-]+)["']/g)) {
      const rel = `supabase/functions/_shared/${m[1]}`;
      if (seen.has(rel)) continue;
      seen.add(rel);
      const abs = path.join(ROOT, rel);
      if (existsSync(abs)) stack.push(abs);
    }
  }
  return [...seen];
}

const res = await fetch(
  `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/functions`,
  { headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` } });
if (!res.ok) {
  console.error(`list failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const deployed = new Map((await res.json()).map((f) => [f.slug, f]));

const local = (await readdir(FUNCTIONS, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== "_shared")
  .map((d) => d.name)
  .sort();

const stale = [];
const missing = [];
const rows = [];

for (const fn of local) {
  const d = deployed.get(fn);
  if (!d) { missing.push(fn); rows.push([fn, "NEVER DEPLOYED", "", ""]); continue; }
  const paths = [`supabase/functions/${fn}`, ...(await sharedFor(fn))];
  const changed = lastCommit(paths);
  const live = new Date(d.updated_at).getTime();
  const old = changed > live;
  if (old) stale.push(fn);
  rows.push([
    fn,
    old ? "STALE" : "current",
    `v${d.version}`,
    `deployed ${new Date(live).toISOString().slice(0, 16).replace("T", " ")}` +
      (old ? `, source ${new Date(changed).toISOString().slice(0, 16).replace("T", " ")}` : ""),
  ]);
}

const w = Math.max(...rows.map((r) => r[0].length));
for (const [fn, state, ver, when] of rows) {
  console.log(`${fn.padEnd(w)}  ${state.padEnd(14)} ${ver.padEnd(5)} ${when}`);
}

// A function deployed and then never touched again is the ordinary case, so
// only the gap is an exit code.
const orphans = [...deployed.keys()].filter((s) => !local.includes(s));
if (orphans.length) console.log(`\ndeployed but not in this repo: ${orphans.join(", ")}`);

console.log();
if (missing.length) console.log(`NEVER DEPLOYED: ${missing.join(", ")}`);
if (stale.length) console.log(`STALE (source is newer than what is running): ${stale.join(", ")}`);
if (!missing.length && !stale.length) console.log(`all ${local.length} functions are current`);
process.exit(missing.length || stale.length ? 1 : 0);
