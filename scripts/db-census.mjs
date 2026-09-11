// EVERY TABLE AND HOW MANY ROWS ARE IN IT — 2026-09-10, for roadmap 2.22.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS
// ---------------------------------------------------------------------------
// 2.22's acceptance test is one sentence — *"restore once into a scratch
// project and compare row counts"* — and **there was no way to take a row
// count.** So the test could not be run even by somebody holding every
// credential, and the item has sat at `[~]` since 2026-09-06 partly for want of
// a tool nobody noticed was missing.
//
//   node scripts/db-census.mjs                       # the platform project
//   node scripts/db-census.mjs --ref=<other-ref>     # the scratch restore
//
// Then the comparison is a `diff` and not a judgement:
//
//   node scripts/db-census.mjs            > census-source.txt
//   node scripts/db-census.mjs --ref=XXX  > census-restored.txt
//   diff census-source.txt census-restored.txt && echo "restore verified"
//
// **It writes nothing and is safe against any project**, including the live
// business one. It is the same read-only Management API path `db-audit.mjs`
// uses, which is the whole reason this needs no `psql`, no `pg_restore` and no
// Docker — none of which are installed on the owner's machine (measured
// 2026-09-10).
//
// ---------------------------------------------------------------------------
// WHY EXACT COUNTS AND NOT THE PLANNER'S ESTIMATE
// ---------------------------------------------------------------------------
// `pg_class.reltuples` is free and is what every "count rows fast" answer
// reaches for. It is an ESTIMATE maintained by `analyze`, it is `-1` on a table
// that has never been analysed, and **a freshly restored database has not been
// analysed** — so on the one database this tool exists to measure it would
// report nonsense that looks like a number. `count(*)` on a schema this size is
// well under a second.
//
// ---------------------------------------------------------------------------
// WHY `auth.users` IS COUNTED AND THE REST OF `auth` IS NOT
// ---------------------------------------------------------------------------
// The nightly dump is `pg_dump` of the whole database, but **a restore into a
// fresh Supabase project lands on a project that already has its own `auth`
// schema**, and the accounts are the one part of it this product's rows point
// at — `memberships.user_id`, `platform_admins.user_id`. A restored database
// whose `customers` all arrived but whose `auth.users` did not is a database
// nobody can log into, and every screen would be empty rather than broken.
// So it is on the census. `auth.sessions` and friends are not: they are
// live-state and a difference there means nothing.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const arg = process.argv.find((a) => a.startsWith("--ref="));
const REF = arg ? arg.slice(6) : (process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF);

// A SKIPPED CHECK MUST SAY IT SKIPPED — this repo's most repeated failure is a
// guard that exits 0 in silence and reads exactly like a pass.
if (!TOKEN || !REF) {
  console.log("SKIPPED — needs SUPABASE_ACCESS_TOKEN and a project ref");
  process.exit(0);
}

const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  // `query_to_xml` runs one `count(*)` per table inside a single round trip.
  // The alternative is a query per table, which on a restore drill against a
  // cold project is a minute of latency for the same answer.
  body: JSON.stringify({
    query: `
    select 'public.' || c.relname as tbl,
           (xpath('/row/c/text()',
                  query_to_xml(format('select count(*) as c from public.%I', c.relname),
                               false, true, '')))[1]::text::bigint as n
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r'
    union all
    select 'auth.users', count(*) from auth.users
     order by 1`,
  }),
});
const text = await res.text();
// `process.exit()` here rather than `exitCode` aborts Node while the fetch
// socket is still closing, and libuv answers with
// `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` on Windows —
// measured 2026-09-10 against a bad `--ref=`. The message is correct and then
// a crash is printed under it, which reads as a broken tool rather than as a
// wrong argument.
if (!res.ok) {
  console.error(`FAILED — ${res.status} ${text.slice(0, 300)}`);
  process.exitCode = 1;
} else {
  const rows = JSON.parse(text);
  // The header carries the project ref so two census files cannot be confused
  // for each other, and `diff` shows it as the first difference if they are.
  console.log(`# census of ${REF} — ${rows.length} tables`);
  let total = 0;
  for (const r of rows) {
    total += Number(r.n);
    console.log(`${String(r.n).padStart(8)}  ${r.tbl}`);
  }
  console.log(`${String(total).padStart(8)}  TOTAL`);
}
