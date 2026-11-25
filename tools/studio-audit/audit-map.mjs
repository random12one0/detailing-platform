// ===========================================================================
// THE PRODUCT MAP — what exists, counted by script, never by an AI (plan §4).
// ===========================================================================
//
// An AI asked "list every screen" skips some and says it is complete, so the
// inventory comes from the real sources and the AI only groups and connects:
//   screens      <Route path="…"> in app/src/main.jsx
//   functions    folders in supabase/functions (not _shared)
//   tables, policies, db functions, cron jobs, storage buckets
//                read from STAGING, which is built from the laptop's own migrations
//   services     every outside host the server code calls, plus every key it reads
// Each item gets an area by plain keyword rules; anything the rules cannot
// place is "Other" and the lead auditor places it. Coverage is measured
// against this list.

import { REPO_ROOT } from "./paths.mjs";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { stagingClient } from "./audit-staging.mjs";

const REPO = process.env.AUDIT_REPO || REPO_ROOT;

// Order matters: the first rule that matches wins.
const AREA_RULES = [
  ["Money", /stripe|pay|invoice|billing|money|expense|receipt|price|pricing|promo|discount|deposit|subscription|connect-account|connected_account|costs?\b|plan-visits|accrue/i],
  ["Booking", /book|slot|reschedul|cancel|calendar|availab|ics|quote|job|weather|forecast|address|bulk|blockout|dropoff|geoapify|openstreetmap|maintenance/i],
  ["Sign-up", /signup|sign-up|invite|auth|create-business|onboard|reset|login|accept-invite|whoami/i],
  ["Customers", /customer|client|plan-link|plan_member|member|unsubscribe|review|vehicle|plans?\b|plan_visits|testimonial/i],
  ["Website", /site|domain|website|template|google-business|brand|photo|gallery|preview|landing|terms|privacy|r2|media|track-visit|campaign|tour/i],
  ["Messages", /email|sms|remind|notif|push|send|resend|vapid|telnyx|message/i],
  ["Back office", /admin|platform|support|watch|probe|heartbeat|alert|action_log|session|outside|tenant|rate|report-problem|digest/i],
  ["Settings", /setting|hours|service|add_on|add-on|categor|business_users|staff|translat|deepl|^businesses$|^\/app$/i],
];
export function areaOf(name) {
  for (const [area, re] of AREA_RULES) if (re.test(name)) return area;
  return "Other";
}

function routes(repo) {
  const src = readFileSync(path.join(repo, "app/src/main.jsx"), "utf8");
  return [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
}
function functions(repo) {
  const dir = path.join(repo, "supabase/functions");
  return readdirSync(dir).filter((d) => d !== "_shared" && statSync(path.join(dir, d)).isDirectory());
}
// Every outside host and every key name the server code uses: services are
// DISCOVERED, never taken from a list (plan §9).
function services(repo) {
  const dir = path.join(repo, "supabase/functions");
  const hosts = new Map(), keys = new Map();
  const walk = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(ts|js)$/.test(e.name)) continue;
      const rel = path.relative(repo, p).split(path.sep).join("/");
      const t = readFileSync(p, "utf8");
      for (const m of t.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
        const h = m[1].toLowerCase();
        if (/supabase\.co$|localhost|example\.(com|org)|detailingplatform\.com$|w3\.org|schema\.org|deno\.land|esm\.sh|jsr\.io/.test(h)) continue;
        (hosts.get(h) || hosts.set(h, new Set()).get(h)).add(rel);
      }
      for (const m of t.matchAll(/Deno\.env\.get\("([A-Z0-9_]+)"\)/g)) {
        if (/^SUPABASE_/.test(m[1])) continue;
        (keys.get(m[1]) || keys.set(m[1], new Set()).get(m[1])).add(rel);
      }
    }
  };
  walk(dir);
  return { hosts: [...hosts].map(([h, f]) => ({ host: h, files: [...f] })), keys: [...keys].map(([k, f]) => ({ key: k, files: [...f] })) };
}

async function database() {
  const s = stagingClient();
  const q = (sql) => s.sql(sql);
  const [tables, policies, fns, cron, buckets] = await Promise.all([
    q("select table_name n from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1"),
    q("select tablename||'.'||policyname n, tablename t from pg_policies where schemaname in ('public','storage') order by 1"),
    q("select p.proname n from pg_proc p join pg_namespace s on s.oid=p.pronamespace where s.nspname='public' and p.prokind='f' order by 1"),
    q("select jobname n, schedule s from cron.job order by 1"),
    q("select id n from storage.buckets order by 1"),
  ]);
  return { tables, policies, fns, cron, buckets };
}

// Builds the full inventory and writes it into the store. Returns the counts.
export async function buildMap(store, { repo = REPO, withDb = true } = {}) {
  const items = [];
  const add = (type, name, extra = {}) => items.push({ id: `${type}:${name}`, type, name, area: extra.area || areaOf(name), path: extra.path || null, meta: extra.meta || null });
  for (const r of routes(repo)) add("route", r, { path: "app/src/main.jsx", area: r === "/" || r === "*" ? "Website" : areaOf(r) });
  for (const f of functions(repo)) add("function", f, { path: `supabase/functions/${f}/index.ts` });
  const sv = services(repo);
  for (const h of sv.hosts) add("service", h.host, { meta: { files: h.files } , area: areaOf(h.files.join(" ")) });
  for (const k of sv.keys) add("key", k.key, { meta: { files: k.files } });
  let db = null;
  if (withDb) {
    db = await database();
    for (const t of db.tables) add("table", t.n);
    for (const p of db.policies) add("policy", p.n, { area: areaOf(p.t) });
    for (const f of db.fns) add("dbfunction", f.n);
    for (const c of db.cron) add("cron", c.n, { meta: { schedule: c.s } });
    for (const b of db.buckets) add("bucket", b.n);
  }
  for (const it of items) store.putMapItem(it);
  // Anything previously mapped that no longer exists is removed, so coverage never counts a ghost.
  const ids = new Set(items.map((i) => i.id));
  for (const old of store.mapItems()) if (old.type !== "flow" && !ids.has(old.id)) store.db.prepare("delete from map_items where id = ?").run(old.id);

  const by = (type) => items.filter((i) => i.type === type);
  const placed = (type) => by(type).filter((i) => i.area !== "Other").length;
  const check = { routes: [placed("route"), by("route").length], functions: [placed("function"), by("function").length] };
  if (withDb) Object.assign(check, { tables: [placed("table"), by("table").length], policies: [placed("policy"), by("policy").length] });
  check.services = [placed("service"), by("service").length];
  store.set("mapCheck", check);
  store.set("mapBuiltAt", new Date().toISOString());
  return { total: items.length, check, other: items.filter((i) => i.area === "Other").map((i) => i.id) };
}

// What one area is made of, for an auditor's brief: the files to start from.
export function areaBrief(store, area) {
  const items = store.mapItems().filter((i) => i.area === area);
  const list = (type) => items.filter((i) => i.type === type).map((i) => i.path ? `${i.name} (${i.path})` : i.name);
  return { items, text: [
    `Screens: ${list("route").join(", ") || "none"}`,
    `Server functions: ${list("function").join(", ") || "none"}`,
    `Tables: ${list("table").join(", ") || "none"}`,
    `Database functions: ${list("dbfunction").join(", ") || "none"}`,
    `Scheduled jobs: ${list("cron").join(", ") || "none"}`,
    `Outside services: ${list("service").join(", ") || "none"}`,
  ].join("\n") };
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const { openStore } = await import("./audit-store.mjs");
  const s = openStore(process.argv[2] || "data/audit/audit.db");
  const r = await buildMap(s);
  console.log(JSON.stringify({ total: r.total, check: r.check, other: r.other.length, otherSample: r.other.slice(0, 25) }, null, 1));
  s.close();
}
