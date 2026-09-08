// A HEALTH CHECK ON THE DATABASE ITSELF — 2026-09-07, at the owner's ask:
// *"Look for any errors or risks and make improvements… even in the database
// you can do stuff with that also."*
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN SUPABASE HAS ADVISORS OF ITS OWN
// ---------------------------------------------------------------------------
// Supabase's dashboard has a security and performance linter, and it is good.
// It is also **behind a login and a permission this session does not hold**,
// which means it is a check somebody has to remember to go and look at — the
// same shape as the monitoring problem roadmap 8.12 exists to solve.
//
// So the four lints that actually matter for THIS schema are here, in the repo,
// runnable with the credentials every other script already uses. It **writes
// nothing** and it is safe to run against any project.
//
//   node scripts/db-audit.mjs
//
// ---------------------------------------------------------------------------
// WHAT IT ASKS, AND WHY EACH ONE IS THE RIGHT QUESTION FOR THIS PRODUCT
// ---------------------------------------------------------------------------
// **1 · A TABLE WITH NO ROW-LEVEL SECURITY.** This is a multi-tenant product
// where the browser holds an anon key and every table it can reach is behind
// RLS. One table without it is every detailer's rows readable by every other
// detailer, and nothing on any screen would look different.
//
// **2 · RLS ON, POLICIES NONE.** Usually a mistake — a table nobody can read.
// **Here it is sometimes deliberate and load-bearing**: `platform_admins` and
// `platform_admin_events` have RLS FORCED with no policies on purpose, so a
// detailer cannot discover who the admins are or forge an audit row. So this
// prints rather than fails, and names the two that are meant to be that way.
//
// **3 · A `security definer` FUNCTION WITH NO `search_path`.** A definer
// function runs as its owner; without a pinned `search_path` a caller can put
// their own schema in front of `public` and have it call their function
// instead of ours. Every one in this repo is supposed to set it.
//
// **4 · A FOREIGN KEY WITH NO INDEX.** Postgres does not create one, and every
// `where business_id = …` in this product — which is nearly every query it
// makes — is that lookup. It is the difference between fast at fifty detailers
// and slow at five hundred, and it is invisible until it is not.

import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/).filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF || env.SUPABASE_PROJECT_REF;
if (!TOKEN || !REF) {
  console.log("SKIPPED — needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF");
  process.exit(0);
}

async function q(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return []; }
}

// **THE TABLES THAT ARE MEANT TO HAVE NO POLICIES.** Named rather than
// guessed, so an EIGHTH one showing up is a finding rather than noise — and a
// check that cries wolf on every run is a check nobody reads.
//
// All seven carry `force row level security` with no policy at all, which is
// the strongest statement available: nothing holding an anon or a signed-in key
// can read a row, and only the service role — which is to say only an edge
// function — ever touches them. **Verified against the live project rather than
// assumed**, on 2026-09-07.
//
// It matters most for two of them. A detailer who could read `rate_hits` could
// clear their own spam throttle; one who could read `platform_promo_codes`
// could use a code nobody ever offered them.
const NO_POLICY_BY_DESIGN = new Set([
  "platform_admins",        // who the admins are, and nobody may make themselves one
  "platform_admin_events",  // the audit trail, which must not be forgeable
  "platform_settings",      // the owner's email, the healthcheck URL, the prices
  "platform_promo_codes",   // OUR codes, for a detailer buying a subscription
  "platform_email_days",    // the shared daily email quota
  "job_heartbeats",         // whether the scheduled jobs are alive
  "rate_hits",              // the spam throttle's own counters
  "stripe_events",          // the webhook idempotency lock
]);

// **THE FOREIGN KEYS DELIBERATELY LEFT UNINDEXED**, with the reason, so this
// reports a NEW one rather than these four for ever.
//
// Every one points at `auth.users`, and **this product never deletes an auth
// user.** Forgetting a customer deletes a `customers` row; removing a staff
// member deletes a MEMBERSHIP. Nothing anywhere deletes the account itself, so
// the check these would speed up is never run.
// `20260907008000_foreign_key_indexes.sql` carries the same list and the same
// reasoning; if it ever stops being true, both change together.
const UNINDEXED_BY_DESIGN = new Set([
  "business_invites (invited_by)",
  "job_photos (created_by)",
  "owner_push_subscriptions (user_id)",
  "platform_admin_events (admin_id)",
]);

let findings = 0;
const say = (label, rows, fmt) => {
  if (!rows.length) { console.log(`  ok    ${label}`); return; }
  findings += rows.length;
  console.log(`  FOUND ${label} — ${rows.length}`);
  for (const r of rows.slice(0, 20)) console.log(`          ${fmt(r)}`);
  if (rows.length > 20) console.log(`          … and ${rows.length - 20} more`);
};

console.log("1. every table a browser can reach is behind row-level security");
say("no table in public has RLS switched off", await q(`
  select c.relname as table
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
   order by 1`), (r) => r.table);

console.log("\n2. RLS on, and something to enforce");
{
  const rows = await q(`
    select c.relname as table
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
       and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
     order by 1`);
  const unexpected = rows.filter((r) => !NO_POLICY_BY_DESIGN.has(r.table));
  for (const r of rows.filter((x) => NO_POLICY_BY_DESIGN.has(x.table))) {
    console.log(`  ok    ${r.table} — no policies, and that is the design`);
  }
  say("no other table is locked with nothing to unlock it", unexpected, (r) => r.table);
}

console.log("\n3. every security-definer function pins its search_path");
say("none is left open to a caller's own schema", await q(`
  select p.proname as fn
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prosecdef
     and (p.proconfig is null
          or not exists (select 1 from unnest(p.proconfig) c where c like 'search_path=%'))
   order by 1`), (r) => r.fn);

console.log("\n4. every foreign key has an index to look it up by");
{
  // **COVERED MEANS "AN INDEX WHOSE FIRST COLUMN IS ONE OF THE KEY'S", NOT AN
  // EXACT MATCH.** The first version demanded an index whose leading columns
  // equalled the key exactly, and it reported `booking_vehicles(business_id,
  // booking_id)` as unindexed while `booking_vehicles_booking_idx` sits right
  // there — an index Postgres will happily use for that check, filtering on the
  // other column. **A composite key is served by an index on its most selective
  // part**, and `booking_id` is far more selective than `business_id`.
  //
  // A check that reports a covered key is the same defect as one that misses an
  // uncovered one: both end with somebody ignoring the output.
  const rows = await q(`
  select conrelid::regclass::text as tbl,
         (select string_agg(attname, ', ' order by attnum)
            from pg_attribute
           where attrelid = conrelid and attnum = any(conkey)) as cols
    from pg_constraint c
   where contype = 'f'
     and connamespace = 'public'::regnamespace
     and not exists (
       select 1 from pg_index i
        where i.indrelid = c.conrelid
          and (i.indkey::smallint[])[0] = any(c.conkey))
   order by 1`);
  const named = rows.map((r) => `${r.tbl} (${r.cols})`);
  for (const k of named.filter((x) => UNINDEXED_BY_DESIGN.has(x))) {
    console.log(`  ok    ${k} — only walked by deleting an auth user, which never happens`);
  }
  say("no other foreign key is left without one",
    named.filter((x) => !UNINDEXED_BY_DESIGN.has(x)).map((k) => ({ k })), (r) => r.k);
}

console.log(`\n${findings === 0 ? "clean" : `${findings} to look at`}`);
