// ===========================================================================
// STAGING — keep the audit's private copy of the platform in step with the laptop.
// ===========================================================================
//
// Plan §6 + §15.9. The laptop app's server half runs on the platform's one
// Supabase project, which IS live. So the audit tests against `detailing-staging`
// (created 2026-10-15 on the free plan, same account): same structure, test
// data only. Before each run this applies any migration the laptop has that
// staging does not, and (later) redeploys changed server functions.
//
//   node audit-staging.mjs status         what staging has vs. the laptop
//   node audit-staging.mjs migrate        apply the missing migrations, in order
//
// Credentials are read from the platform repo's git-ignored .env / .env.staging
// and never printed. Every live project ref inside a migration is rewritten to
// staging's, so a scheduled job copied over calls staging, never live.

import { REPO_ROOT } from "./paths.mjs";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";

export const LIVE_REF = "kguqylyzgyzfktkfnhjb";
const REPO = process.env.AUDIT_REPO || REPO_ROOT;

export function readEnv(file) {
  const out = {};
  let text = ""; try { text = readFileSync(file, "utf8"); } catch { return out; }
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

// Pure: what the migration becomes on staging. Exported for the test.
export function forStaging(sql, stagingRef) {
  if (!/^[a-z]{20}$/.test(stagingRef) || stagingRef === LIVE_REF) throw new Error("refusing: staging ref looks wrong");
  return sql.split(LIVE_REF).join(stagingRef);
}

// envRepo: where the keys live (the real checkout); repo: where the code is (maybe the audit's copy)
export function stagingClient({ repo = REPO, envRepo = null } = {}) {
  const k = envRepo || repo;
  const env = { ...readEnv(path.join(k, ".env")), ...readEnv(path.join(k, ".env.staging")) };
  const token = env.SUPABASE_ACCESS_TOKEN, ref = env.STAGING_PROJECT_REF;
  if (!token || !ref) throw new Error("staging is not set up (.env.staging missing STAGING_PROJECT_REF)");
  if (ref === LIVE_REF) throw new Error("refusing: STAGING_PROJECT_REF points at live");
  // The laptop is often on a phone hotspot that drops for a second: retry network errors, not refusals.
  const api = async (p, init = {}) => {
    for (let i = 0; ; i++) {
      try { return await api1(p, init); }
      catch (e) { if (e.status || i >= 3) throw e; await new Promise((x) => setTimeout(x, 2000 * (i + 1))); }
    }
  };
  const api1 = async (p, init = {}) => {
    const r = await fetch(`https://api.supabase.com/v1/projects/${ref}${p}`, {
      ...init, headers: { Authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers || {}) } });
    const text = await r.text();
    let body; try { body = JSON.parse(text); } catch { body = text; }
    if (!r.ok) { const e = new Error(`${r.status} ${typeof body === "string" ? body : JSON.stringify(body)}`.slice(0, 1500)); e.status = r.status; throw e; }
    return body;
  };
  const sql = (query) => api("/database/query", { method: "POST", body: JSON.stringify({ query }) });
  return { ref, api, sql };
}

const BOOK = `create schema if not exists audit_staging;
create table if not exists audit_staging.applied (name text primary key, at timestamptz not null default now());`;

export async function status({ repo = REPO, envRepo = null } = {}) {
  const s = stagingClient({ repo, envRepo });
  await s.sql(BOOK);
  const have = new Set((await s.sql("select name from audit_staging.applied")).map((r) => r.name));
  const files = readdirSync(path.join(repo, "supabase", "migrations")).filter((f) => f.endsWith(".sql")).sort();
  return { ref: s.ref, total: files.length, applied: files.filter((f) => have.has(f)).length, missing: files.filter((f) => !have.has(f)) };
}

export async function migrate({ repo = REPO, envRepo = null, log = console.log } = {}) {
  const s = stagingClient({ repo, envRepo });
  const st = await status({ repo, envRepo });
  for (const f of st.missing) {
    const text = forStaging(readFileSync(path.join(repo, "supabase", "migrations", f), "utf8"), s.ref);
    try {
      // one migration + its bookkeeping row together, so a failure leaves nothing half-recorded
      await s.sql(`${text}\n;\ninsert into audit_staging.applied (name) values ('${f.replace(/'/g, "''")}');`);
      log(`applied ${f}`);
    } catch (e) {
      log(`FAILED ${f}: ${e.message}`);
      return { ok: false, failedAt: f, error: e.message, applied: st.applied };
    }
  }
  return { ok: true, ...(await status({ repo, envRepo })) };
}

// ── server functions: redeploy only the ones whose code changed since the last sync ──
// A function's fingerprint covers its own index.ts AND every _shared file, because the
// deploy bundles all of _shared into each function (scripts/deploy-functions.mjs).
export function functionHashes(repo = REPO) {
  const fnRoot = path.join(repo, "supabase", "functions");
  const shared = [];
  const walk = (d, rel = "") => { for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, rel + e.name + "/"); else if (/\.(ts|js)$/.test(e.name)) shared.push(rel + e.name + "\n" + readFileSync(p, "utf8")); } };
  walk(path.join(fnRoot, "_shared"));
  const sharedHash = createHash("sha256").update(shared.sort().join("\n")).digest("hex");
  const out = {};
  for (const e of readdirSync(fnRoot, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name === "_shared") continue;
    let src = ""; try { src = readFileSync(path.join(fnRoot, e.name, "index.ts"), "utf8"); } catch { continue; }
    out[e.name] = createHash("sha256").update(sharedHash + src).digest("hex").slice(0, 16);
  }
  return out;
}

export async function syncFunctions({ repo = REPO, envRepo = null, log = console.log } = {}) {
  const s = stagingClient({ repo, envRepo });
  await s.sql("create table if not exists audit_staging.functions (name text primary key, hash text not null, at timestamptz not null default now())");
  const have = Object.fromEntries((await s.sql("select name, hash from audit_staging.functions")).map((r) => [r.name, r.hash]));
  const want = functionHashes(repo);
  const changed = Object.keys(want).filter((n) => have[n] !== want[n]);
  if (!changed.length) return { ok: true, deployed: [] };
  const env = { ...process.env, ...readEnv(path.join(envRepo || repo, ".env")), SUPABASE_PROJECT_REF: s.ref };
  if (env.SUPABASE_PROJECT_REF === LIVE_REF) throw new Error("refusing: would deploy to live");
  const out = await new Promise((resolve) => {
    const c = spawn(process.execPath, [path.join(repo, "scripts", "deploy-functions.mjs"), ...changed], { cwd: repo, env, windowsHide: true });
    let t = ""; c.stdout.on("data", (x) => (t += x)); c.stderr.on("data", (x) => (t += x));
    c.on("close", (code) => resolve({ code, t }));
  });
  const ok = out.code === 0;
  const done = ok ? changed : changed.filter((n) => out.t.includes(`deployed ${n} `));
  if (done.length) await s.sql(`insert into audit_staging.functions (name, hash) values ${done.map((n) => `('${n}','${want[n]}')`).join(",")} on conflict (name) do update set hash = excluded.hash, at = now()`);
  log(`staging functions: ${done.length} of ${changed.length} redeployed${ok ? "" : " — " + out.t.slice(-300)}`);
  return { ok, deployed: done, error: ok ? null : out.t.slice(-500) };
}

// Everything before a run: new migrations, changed functions. (Test data is reseeded by the journeys' setup.)
export async function sync({ repo = REPO, envRepo = null, log = console.log } = {}) {
  const m = await migrate({ repo, envRepo, log });
  if (!m.ok) return { ok: false, said: `A migration failed on staging: ${m.failedAt}`, migrate: m };
  const f = await syncFunctions({ repo, envRepo, log });
  return { ok: f.ok, said: f.ok ? `Staging is up to date (${f.deployed.length} function${f.deployed.length === 1 ? "" : "s"} redeployed).` : "Some functions did not deploy to staging.", migrate: m, functions: f };
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const cmd = process.argv[2] || "status";
  if (cmd === "sync") { console.log(JSON.stringify((({ said, functions }) => ({ said, deployed: functions?.deployed?.length }))(await sync()))); process.exit(0); }
  const out = cmd === "migrate" ? await migrate() : await status();
  if (cmd !== "migrate") console.log(JSON.stringify({ ...out, missing: out.missing.length > 8 ? [...out.missing.slice(0, 8), `…+${out.missing.length - 8}`] : out.missing }, null, 1));
  else console.log(JSON.stringify({ ok: out.ok, failedAt: out.failedAt, applied: out.applied, total: out.total }));
}
