// ===========================================================================
// AUDIT STORE — everything the Audit tab knows, in one SQLite file.
// ===========================================================================
//
// Plan: audit-tab/PLAN.md §8. node:sqlite is built into Node 24, so nothing is
// installed. Evidence FILES (screenshots, traces) live beside it in
// data/audit/evidence/<run>/; this file holds the records that point at them.
//
// Every write goes through here so the page, the engine and the tests agree on
// one shape. Rows come back as plain objects with JSON columns already parsed.

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

const JSON_COLS = new Set(["scope", "kinds", "areas", "files", "proof", "second_check", "meta", "steps", "last_result", "data"]);

const SCHEMA = `
create table if not exists runs (
  id text primary key, n integer not null, title text not null,
  status text not null default 'planned',          -- planned running paused stopped done failed
  scope text, kinds text, git_sha text, target text default 'laptop',
  started_at text, ended_at text, cost_usd real not null default 0, cap_usd real,
  report_path text, note text
);
create table if not exists cells (
  id text primary key, run_id text not null, area text not null, kind text not null,
  status text not null default 'todo',              -- todo running clean findings failed shelved skipped
  role text, model text, attempts integer not null default 0,
  started_at text, ended_at text, cost_usd real not null default 0, summary text, step text
);
create table if not exists findings (
  id text primary key, run_id text not null, cell_id text,
  category text not null,                           -- defect improvement opportunity debt unverified
  severity text not null,                           -- blocker before after idea
  title text not null, areas text, files text,
  intended text, implemented text, observed text, recommendation text, repro text, proof text,
  confidence text, impact text, benefit text, effort text, risk text,
  status text not null default 'unverified',        -- unverified probable confirmed disputed rejected sent fixed rechecked dismissed duplicate
  second_check text, roadmap_id text, duplicate_of text,
  finder_role text, finder_model text, cost_usd real not null default 0,
  created_at text not null, updated_at text not null, user_note text
);
create table if not exists evidence (
  id integer primary key autoincrement, run_id text not null, cell_id text, finding_id text,
  kind text not null,                               -- file shot trace net console db email test timing note
  ref text not null, detail text, created_at text not null
);
create table if not exists events (
  id integer primary key autoincrement, run_id text not null, cell_id text,
  at text not null, kind text not null, text text not null
);
create table if not exists map_items (
  id text primary key, area text not null, type text not null, name text not null,
  path text, meta text, updated_at text not null
);
create table if not exists journeys (
  id text primary key, name text not null, area text not null, steps text not null,
  source text, last_result text, last_run_at text
);
create table if not exists kv (k text primary key, data text);
create index if not exists cells_run on cells(run_id);
create index if not exists findings_run on findings(run_id);
create index if not exists events_run on events(run_id, id);
`;

const now = () => new Date().toISOString();

// Anything shaped like a key or token is blanked before it is stored: finding text ends up in
// docs/audits/*.md, which is committed (review 2026-10-20; plan §8 "secrets are scrubbed").
const SECRET = /\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}|\bwhsec_[A-Za-z0-9]{8,}|\bsbp_[A-Za-z0-9]{16,}|\bsb_(secret|publishable)_[A-Za-z0-9_-]{8,}|\beyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}|\bre_[A-Za-z0-9]{20,}/g;
export const scrub = (v) => typeof v === "string" ? v.replace(SECRET, "[hidden key]") : v;
const TEXT = ["title", "intended", "implemented", "observed", "recommendation", "repro", "impact", "benefit", "user_note", "summary", "detail", "ref", "text"];
const clean = (row) => { const o = { ...row }; for (const k of TEXT) if (k in o) o[k] = scrub(o[k]); return o; };
const enc = (k, v) => (JSON_COLS.has(k) && v != null && typeof v !== "string" ? JSON.stringify(v) : v);
function dec(row) {
  if (!row) return row;
  const o = { ...row };
  for (const k of Object.keys(o)) if (JSON_COLS.has(k) && typeof o[k] === "string") { try { o[k] = JSON.parse(o[k]); } catch {} }
  return o;
}

export const AREAS = ["Booking", "Money", "Sign-up", "Customers", "Website", "Messages", "Back office", "Settings"];
// Short labels so six columns fit a 390px phone (mockup, measured 2026-10-15).
export const KINDS = [
  { id: "code", label: "Code" }, { id: "looks", label: "Looks" }, { id: "security", label: "Safety" },
  { id: "backend", label: "Data" }, { id: "integrations", label: "Links" }, { id: "product", label: "Product" },
];
export const SEVERITIES = ["blocker", "before", "after", "idea"];

export function openStore(file) {
  mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("pragma journal_mode = wal; pragma busy_timeout = 3000;");
  db.exec(SCHEMA);
  // later columns, added to databases made before them
  for (const sql of ["alter table findings add column fkey text", "create index if not exists findings_key on findings(fkey)"]) { try { db.exec(sql); } catch {} }

  const insert = (table, row) => {
    row = clean(row);
    const keys = Object.keys(row);
    db.prepare(`insert into ${table} (${keys.join(",")}) values (${keys.map(() => "?").join(",")})`)
      .run(...keys.map((k) => enc(k, row[k])));
  };
  const update = (table, id, patch) => {
    patch = clean(patch);
    const keys = Object.keys(patch);
    if (!keys.length) return;
    db.prepare(`update ${table} set ${keys.map((k) => `${k} = ?`).join(",")} where id = ?`)
      .run(...keys.map((k) => enc(k, patch[k])), id);
  };
  const all = (sql, ...p) => db.prepare(sql).all(...p).map(dec);
  const one = (sql, ...p) => dec(db.prepare(sql).get(...p));

  return {
    db, file,
    close: () => db.close(),

    // ── runs ──
    newRun({ title, scope, kinds, git_sha = null, cap_usd = null, target = "laptop" }) {
      const n = (one("select max(n) m from runs")?.m || 0) + 1;
      const id = `run-${n}`;
      insert("runs", { id, n, title, scope, kinds, git_sha, cap_usd, target, status: "planned" });
      return this.run(id);
    },
    run: (id) => one("select * from runs where id = ?", id),
    runs: () => all("select * from runs order by n desc"),
    latestRun: () => one("select * from runs order by n desc limit 1"),
    setRun: (id, patch) => update("runs", id, patch),

    // ── cells ──
    addCell({ run_id, area, kind, role = null, model = null, id = null, summary = null }) {
      id = id || `${run_id}:${area}:${kind}`;
      insert("cells", { id, run_id, area, kind, role, model, summary });
      return id;
    },
    cells: (run_id) => all("select * from cells where run_id = ? order by rowid", run_id),   // creation order = priority order
    cell: (id) => one("select * from cells where id = ?", id),
    setCell: (id, patch) => update("cells", id, patch),

    // ── findings ──
    addFinding(f) {
      const run = one("select n from runs where id = ?", f.run_id);
      const k = (one("select count(*) c from findings where run_id = ?", f.run_id)?.c || 0) + 1;
      const id = f.id || `R${run?.n ?? 0}-${String(k).padStart(2, "0")}`;
      const t = now();
      insert("findings", { status: "unverified", ...f, id, created_at: t, updated_at: t });
      return id;
    },
    finding: (id) => one("select * from findings where id = ?", id),
    findings: (run_id) => run_id
      ? all("select * from findings where run_id = ? order by created_at", run_id)
      : all("select * from findings order by created_at desc"),
    setFinding: (id, patch) => update("findings", id, { ...patch, updated_at: now() }),
    // The same problem seen again (same fingerprint) in any run. A finding that was fixed and
    // re-checked does not count: if it comes back, that is a new finding (a regression).
    findingsByKey: (fkey) => fkey ? all("select * from findings where fkey = ? and status != 'rechecked' order by created_at", fkey) : [],
    findingByKey: (fkey) => fkey ? one("select * from findings where fkey = ? and status != 'rechecked' order by created_at limit 1", fkey) : null,
    // second checks still owed, in any run (a stopped run leaves some behind)
    owedChecks: () => all("select * from findings where status = 'unverified' order by created_at"),

    // ── evidence ──
    addEvidence(e) { insert("evidence", { ...e, created_at: now() }); },
    evidenceFor: (finding_id) => all("select * from evidence where finding_id = ? order by id", finding_id),
    evidenceForCell: (cell_id) => all("select * from evidence where cell_id = ? order by id", cell_id),

    // ── live events ──
    event(run_id, cell_id, kind, text) {
      insert("events", { run_id, cell_id, kind, text: String(text).slice(0, 2000), at: now() });
    },
    events: (run_id, after = 0, limit = 200) =>
      all("select * from events where run_id = ? and id > ? order by id limit ?", run_id, after, limit),

    // ── product map ──
    putMapItem(item) {
      db.prepare(`insert into map_items (id, area, type, name, path, meta, updated_at) values (?,?,?,?,?,?,?)
        on conflict(id) do update set area=excluded.area, type=excluded.type, name=excluded.name,
        path=excluded.path, meta=excluded.meta, updated_at=excluded.updated_at`)
        .run(item.id, item.area, item.type, item.name, item.path ?? null, enc("meta", item.meta ?? null), now());
    },
    mapItems: () => all("select * from map_items order by area, type, name"),

    // ── journeys ──
    putJourney(j) {
      db.prepare(`insert into journeys (id, name, area, steps, source) values (?,?,?,?,?)
        on conflict(id) do update set name=excluded.name, area=excluded.area, steps=excluded.steps, source=excluded.source`)
        .run(j.id, j.name, j.area, enc("steps", j.steps), j.source ?? null);
    },
    journeys: () => all("select * from journeys order by area, name"),
    setJourney: (id, patch) => update("journeys", id, patch),

    // ── small values (benchmark score, last publish check…) ──
    get: (k) => one("select data from kv where k = ?", k)?.data ?? null, // "data" is a JSON column: dec() parses it
    set: (k, v) => db.prepare("insert into kv (k, data) values (?, ?) on conflict(k) do update set data = excluded.data")
      .run(k, JSON.stringify(v)),

    // ── what the tab shows at a glance ──
    summary(run_id) {
      const run = run_id ? this.run(run_id) : this.latestRun();
      if (!run) return { run: null };
      const f = this.findings(run.id);
      const count = (pred) => f.filter(pred).length;
      const passed = (x) => ["probable", "confirmed", "sent", "fixed", "rechecked"].includes(x.status);
      return {
        run,
        cells: this.cells(run.id),
        loop: {
          found: f.length,
          passed: count(passed),
          sent: count((x) => ["sent", "fixed", "rechecked"].includes(x.status)),
          rechecked: count((x) => x.status === "rechecked"),
        },
        // "waiting for you" = passed the second check and not yet answered
        waiting: Object.fromEntries(SEVERITIES.map((s) => [s, count((x) => x.severity === s && ["probable", "confirmed"].includes(x.status))])),
      };
    },
  };
}
