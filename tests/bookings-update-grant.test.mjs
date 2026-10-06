// ROADMAP 8.10d — THE BROWSER MUST NOT BE ABLE TO WRITE `bookings.weather`
// OR `bookings.weather_at`, AND A FUTURE GRANT THAT REOPENS IT GOES RED HERE.
//
//   node --test tests/bookings-update-grant.test.mjs
//
// Credential-free: it reads `supabase/migrations/` and nothing else. It
// REPLAYS every grant and revoke that can touch `public.bookings`, in file
// order, from Supabase's starting state (`anon` and `authenticated` hold every
// table privilege on everything in `public`), and asks one question at the
// end: can `anon`, `authenticated` or PUBLIC update either column?
//
// The rule it encodes is the one that made 8.10d: **a column revoke is void
// while the role holds table-level UPDATE**, and **revoking the table privilege
// revokes every column privilege with it** (Postgres REVOKE docs). So a later
// `grant update on public.bookings to authenticated`, a `grant all`, or a
// `grant … on all tables in schema public` reopens both columns and this goes
// red; a column grant of some OTHER field (a future screen that legitimately
// writes `admin_notes`) does not.
//
// BLIND SPOTS, said rather than hidden: it reads migrations, not the live
// database — `scripts/migration-drift.mjs` is the half that compares the two.
// A grant built inside a dollar-quoted block (`execute 'grant …'`) cannot be
// replayed; if one ever mentions bookings or "all tables", this FAILS naming
// it rather than skipping it. Roles other than anon/authenticated/PUBLIC are
// not judged (service_role is meant to write weather).
//
// THE CANARIES RUN EVERY TIME, against the same `replay()` the real verdict
// uses: the repo with 8.10d's migration removed must be red (that is the hole
// as it stood), and each planted reopening must be red.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIR = path.join(ROOT, "supabase", "migrations");
const FIX = "20261006040000_bookings_browser_updates_nothing.sql";
const WATCHED = ["weather", "weather_at"];
const ROLES = ["anon", "authenticated", "public"];

const strip = (sql) => sql
  .replace(/\$([a-zA-Z_]*)\$[\s\S]*?\$\1\$/g, (m) => (/\b(grant|revoke)\b/i.test(m) && /bookings|all\s+tables/i.test(m) ? " __UNJUDGEABLE__ " : " "))
  .replace(/--[^\n]*/g, " ")
  .replace(/\/\*[\s\S]*?\*\//g, " ");

const splitTop = (s) => {   // split on commas outside parentheses
  const out = []; let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};

/** files: [{ name, sql }] in order -> { open: [...], unjudgeable: [...] } */
export function replay(files) {
  const table = Object.fromEntries(ROLES.map((r) => [r, r !== "public"])); // Supabase default
  const cols = Object.fromEntries(ROLES.map((r) => [r, new Set()]));
  const unjudgeable = [];
  for (const { name, sql } of files) {
    const s = strip(sql);
    if (s.includes("__UNJUDGEABLE__")) unjudgeable.push(`${name}: a grant/revoke inside a dollar-quoted block mentions bookings or "all tables"`);
    for (const m of s.matchAll(/\b(grant|revoke)\s+([\s\S]+?)\s+on\s+(?:table\s+)?([\s\S]+?)\s+(to|from)\s+([\s\S]+?)\s*;/gi)) {
      const [, verb, privs, objs, , roleList] = m;
      const on = /^all\s+tables\s+in\s+schema\s+public$/i.test(objs.trim())
        || splitTop(objs).some((o) => /^(public\.)?"?bookings"?$/i.test(o));
      if (!on || /^(function|sequence|schema|all\s+(functions|sequences))\b/i.test(objs.trim())) continue;
      const roles = splitTop(roleList.replace(/\s+(with\s+grant\s+option|granted\s+by\s+\S+|cascade|restrict)\b.*$/i, ""))
        .map((r) => r.toLowerCase()).filter((r) => ROLES.includes(r));
      const grant = verb.toLowerCase() === "grant";
      for (const p of splitTop(privs.replace(/^grant\s+option\s+for\s+/i, ""))) {
        const pm = p.match(/^(all(?:\s+privileges)?|update)\s*(?:\(([^)]*)\))?$/i);
        if (!pm) continue; // select, insert, delete… — not UPDATE
        const list = pm[2]?.split(",").map((c) => c.trim().replace(/"/g, "").toLowerCase());
        for (const r of roles) {
          if (list) for (const c of list) grant ? cols[r].add(c) : cols[r].delete(c);
          else if (grant) table[r] = true;
          else { table[r] = false; cols[r].clear(); }
        }
      }
    }
  }
  const can = (r, c) => table[r] || table.public || cols[r].has(c) || cols.public.has(c);
  const open = [];
  for (const r of ROLES) for (const c of WATCHED) if (can(r, c)) open.push(`${r} can UPDATE bookings.${c}`);
  return { open, unjudgeable };
}

const repo = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort()
  .map((name) => ({ name, sql: readFileSync(path.join(DIR, name), "utf8") }));

test("the fix migration exists (discovery floor: a renamed file must not pass silently)", () => {
  assert.ok(repo.some((f) => f.name === FIX), `${FIX} is missing from supabase/migrations/`);
});

test("after every migration, no browser role can update bookings.weather or weather_at", () => {
  const { open, unjudgeable } = replay(repo);
  assert.deepEqual(unjudgeable, [], "a grant this test cannot replay mentions bookings");
  assert.deepEqual(open, [], `REOPENED:\n  ${open.join("\n  ")}`);
});

const plant = (sql) => [...repo, { name: "99999999999999_planted.sql", sql }];
const CANARIES = {
  "the repo WITHOUT 8.10d's migration (the hole as it stood)": repo.filter((f) => f.name !== FIX),
  "a table-wide `grant update on public.bookings to authenticated`": plant("grant update on public.bookings to authenticated;"),
  "`grant all privileges on table bookings to anon`": plant("grant all privileges on table bookings to anon;"),
  "`grant all on all tables in schema public to authenticated`": plant("grant all on all tables in schema public to authenticated;"),
  "a column grant `grant update (status, weather) on public.bookings to authenticated`": plant("grant update (status, weather) on public.bookings to authenticated;"),
  "a grant to PUBLIC": plant("grant update on public.bookings to public;"),
  "a grant hidden inside a DO block": plant("do $$ begin execute 'grant update on public.bookings to authenticated'; end $$;"),
};
for (const [name, files] of Object.entries(CANARIES)) {
  test(`canary — red on ${name}`, () => {
    const { open, unjudgeable } = replay(files);
    assert.ok(open.length + unjudgeable.length > 0, `NOT CAUGHT: ${name} replayed as closed, so the verdict above is void`);
  });
}

test("control — a column grant of an ordinary field does NOT reopen weather", () => {
  const { open } = replay(plant("grant update (admin_notes) on public.bookings to authenticated;"));
  assert.deepEqual(open, [], "a legitimate future column grant read as a reopening; the check is just counting grants");
});

test("control — a table-wide revoke clears an earlier column grant (Postgres REVOKE semantics)", () => {
  const { open } = replay(plant("grant update (weather) on public.bookings to authenticated;\nrevoke update on public.bookings from authenticated;"));
  assert.deepEqual(open, [], "a revoked column grant still read as open; the replay has the REVOKE rule wrong");
});
