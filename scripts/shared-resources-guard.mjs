// ROADMAP 14.17 — A READ-ONLY GUARD FOR THE SHARED RESOURCES.
// The page it serves is docs/shared-resources.md. Logic: scripts/lib/sharedResources.mjs.
//
//   set -a; . ./.env; set +a
//   node scripts/shared-resources-guard.mjs before                     # sample, save
//   ...run whatever you were going to run...
//   node scripts/shared-resources-guard.mjs after --mine=rate_hits/address-suggest,demo/bookings
//   node scripts/shared-resources-guard.mjs run --mine=... -- node scripts/x.mjs   # both, around a command
//   add --receipt to `after`/`run` to write receipts/shared-resources-guard.json
//
// WHAT IT READS (GET and HEAD only; it has no write path to the database):
//   · rate_hits — every bucket, every window in the last two days
//   · platform_email_days — today's sent / failed / claimed / refused / refused_platform
//   · the demo tenant's row count in every table that has a business_id column
//     (tables discovered from PostgREST's own schema, not listed here), and a
//     fingerprint of bookings' id:status so a status change is seen
//
// WHAT IT CAN NEVER SAY is "no collision". Every verdict is printed with the
// list of resources it is blind to, the platform ceiling above address-suggest
// (14.15) first among them — see BLIND in the lib. `--mine=` names what THIS
// session moved, by counter-name prefix; anything else that moved is named.
//
// Exit 0: nothing undeclared moved. Exit 1: something did (a lead, not a
// verdict). Exit 2: the guard itself could not read (never a pass).
// Rate-limit keys are hashed: they can be IP addresses or phone numbers.

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeReceipt } from "./receipt.mjs";
import { BLIND, diffSnapshots, render } from "./lib/sharedResources.mjs";

const { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SR } = process.env;
if (!URL_ || !SR) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — load .env first"); process.exit(2); }
// THIS PLATFORM'S OWN PROJECT, AND NOTHING ELSE (CLAUDE.md hard rules).
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) { console.error(`refusing: SUPABASE_URL is not kguqylyzgyzfktkfnhjb (${URL_})`); process.exit(2); }

const SLUG = "demo-detail";
const DEMO_TABLES_FLOOR = 5;   // a discovery floor, not a count: finding more is fine
const H = { apikey: SR, Authorization: `Bearer ${SR}` };
const args = process.argv.slice(2);
const mode = args[0];
const flag = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || "").slice(n.length + 3);
const mine = flag("mine").split(",").filter(Boolean);
const FILE = flag("file") || join(tmpdir(), "shared-resources-before.json");
const hash = (s) => createHash("sha1").update(String(s)).digest("hex").slice(0, 8);

const get = async (path, extra = {}) => {
  const r = await fetch(URL_ + path, { headers: { ...H, ...extra } });
  if (!r.ok) throw new Error(`${path.split("?")[0]} -> ${r.status}`);
  return r;
};

async function snapshot() {
  const counters = {};
  const read = { rate_hits: 0, email_day: 0, demo_tables: 0 };

  const since = new Date(Date.now() - 2 * 864e5).toISOString();
  const rows = await (await get(`/rest/v1/rate_hits?select=bucket,key,window_start,hits&window_start=gte.${since}&limit=1000`)).json();
  // PostgREST caps a response silently; a capped read would look like a quiet table.
  if (rows.length >= 1000) throw new Error("rate_hits read hit the 1000-row cap; the guard would be reading a part and calling it the whole");
  for (const x of rows) counters[`rate_hits/${x.bucket}/${x.key === "all" ? "all" : hash(x.key)}/${x.window_start}`] = x.hits;
  read.rate_hits = 1;

  const day = new Date().toISOString().slice(0, 10);
  const [e] = await (await get(`/rest/v1/platform_email_days?day=eq.${day}&select=sent,failed,claimed,refused,refused_platform`)).json();
  // No row yet today is a true zero, not a missing reading.
  for (const f of ["sent", "failed", "claimed", "refused", "refused_platform"]) counters[`email/${day}/${f}`] = e?.[f] ?? 0;
  read.email_day = 1;

  const [biz] = await (await get(`/rest/v1/businesses?slug=eq.${SLUG}&select=id`)).json();
  if (!biz) throw new Error(`no business with slug ${SLUG}`);
  const spec = await (await get("/rest/v1/")).json();
  const tables = Object.entries(spec.definitions || {}).filter(([, d]) => d.properties?.business_id).map(([t]) => t).sort();
  for (const t of tables) {
    const r = await get(`/rest/v1/${t}?business_id=eq.${biz.id}&select=business_id`, { Prefer: "count=exact", Range: "0-0" });
    counters[`demo/${t}`] = Number((r.headers.get("content-range") || "").split("/")[1]);
    if (!Number.isFinite(counters[`demo/${t}`])) throw new Error(`no row count for ${t}`);
  }
  const bk = await (await get(`/rest/v1/bookings?business_id=eq.${biz.id}&select=id,status&order=id&limit=1000`)).json();
  counters["demo/bookings.status"] = hash(bk.map((b) => `${b.id}:${b.status}`).join("|"));
  read.demo_tables = tables.length;
  return { taken_at: new Date().toISOString(), counters, read };
}

const take = async () => {
  try { return await snapshot(); } catch (e) { console.error(`GUARD COULD NOT READ — this is not a pass: ${e.message}`); process.exit(2); }
};

async function after(b0, started) {
  const b1 = await take();
  const d = diffSnapshots(b0.counters, b1.counters, mine);
  console.log(render(d, mine));

  // THE CANARY: hand the same logic a counter that moved with nobody declaring
  // it, and a declared one, and require the first named and the second not.
  const fake = { ...b0.counters, "rate_hits/address-suggest/canary/x": 1, "demo/canary-table": 2 };
  const cd = diffSnapshots(b0.counters, fake, ["demo/canary-table"]);
  const canaryOk = cd.unexplained.length === 1 && cd.unexplained[0].name === "rate_hits/address-suggest/canary/x"
    && render(cd, []).includes("14.15") && BLIND.length >= 6;

  if (args.includes("--receipt")) {
    const ok = b1.read.rate_hits && b1.read.email_day && b1.read.demo_tables >= DEMO_TABLES_FLOOR && canaryOk;
    const failures = [];
    if (b1.read.demo_tables < DEMO_TABLES_FLOOR) failures.push(`discovered ${b1.read.demo_tables} demo tables, floor ${DEMO_TABLES_FLOOR}`);
    if (!canaryOk) failures.push("canary: a planted unclaimed counter was not named, or the blind list lost 14.15");
    const { path } = writeReceipt({
      check_id: "shared-resources-guard", started_at: started, status: ok ? "pass" : "fail",
      expected_targets: 3, discovered_targets: b1.read.rate_hits + b1.read.email_day + (b1.read.demo_tables >= DEMO_TABLES_FLOOR ? 1 : 0),
      attempted_targets: 3, completed_targets: b1.read.rate_hits + b1.read.email_day + (b1.read.demo_tables >= DEMO_TABLES_FLOOR ? 1 : 0),
      skipped_targets: 0, assertions_executed: 4, min_assertions: 3, failures,
      warnings: ["A pass here means the guard READ all three sources and caught its planted counter. What moved is in `observed`, not in `status`.", ...BLIND.map((x) => "BLIND: " + x)],
      artifacts: ["docs/shared-resources.md"],
      canary: { id: "planted-unclaimed-counter-is-named", observed_failure: canaryOk },
      dimensions: { item: "14.17", mine },
      observed: { counters: d.counters, moved: d.moved.length, unexplained: d.unexplained.map((m) => m.name), demo_tables: b1.read.demo_tables },
    });
    console.log(`receipt: ${path}`);
  }
  process.exit(d.unexplained.length ? 1 : 0);
}

if (mode === "before") {
  const b = await take();
  writeFileSync(FILE, JSON.stringify(b));
  console.log(`sampled ${Object.keys(b.counters).length} counters (${b.read.demo_tables} demo tables) -> ${FILE}`);
} else if (mode === "after") {
  await after(JSON.parse(readFileSync(FILE, "utf8")), new Date().toISOString());
} else if (mode === "run") {
  const cmd = args.slice(args.indexOf("--") + 1);
  if (args.indexOf("--") < 0 || !cmd.length) { console.error("usage: run [--mine=...] -- <command...>"); process.exit(2); }
  const started = new Date().toISOString();
  const b0 = await take();
  const r = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit", shell: process.platform === "win32" });
  console.log(`\n--- command exited ${r.status} ---`);
  await after(b0, started);
} else {
  console.error("usage: before | after [--mine=a,b] [--receipt] | run [--mine=a,b] -- <command...>");
  process.exit(2);
}
