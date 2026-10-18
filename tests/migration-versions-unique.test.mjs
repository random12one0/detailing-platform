// TWO MIGRATIONS MUST NEVER SHARE A VERSION NUMBER. Credential-free, one directory read.
//
//   node --test tests/migration-versions-unique.test.mjs
//   MIGRATION_CANARY=off node --test tests/migration-versions-unique.test.mjs   # skips the canary; it must then say so
//
// A migration's version is the digits before its first "_". The belt runs jobs on branches cut from
// different points of main, and each job picks its own timestamp, so two branches can both choose
// `20261017030000`; each is green alone and the clash only exists once both are merged. Found by the
// supervisor 2026-10-17: held 97.13 (`domain_claims_need_proof`) against 97.14 on main
// (`staff_cannot_delete_bookings_or_write_customers`), and held 97.18 (`booking_day_rules_lock`)
// against 97.19 on main (`campaigns_get_a_daily_share`). A release row that says "apply 20261017030000"
// then names two files, and `supabase db push` refuses a duplicate version outright.
//
// The belt's full suite runs on the MERGED tree, so this goes red at the merge, which is the only
// place the clash exists.
//
// KNOWN is a declaration of debt, so it is an EQUALITY (docs/gotchas.md 98): the one pair that was
// already on main when this was written. Never add to it to make this green; rename the newer,
// unapplied file instead (both halves of a fresh clash are unapplied until Andrew publishes).

import { readdirSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const KNOWN = ["20260913010000"]; // watchdog_never_loses_a_claim + weather_cache, both on main before this guard

export const duplicateVersions = (files) => {
  const seen = new Map();
  for (const f of files.filter((f) => f.endsWith(".sql"))) {
    const v = f.split("_")[0];
    seen.set(v, [...(seen.get(v) || []), f]);
  }
  return [...seen].filter(([, fs]) => fs.length > 1).map(([v, fs]) => ({ version: v, files: fs }));
};

const files = readdirSync(new URL("../supabase/migrations/", import.meta.url));

test("every migration has a version of its own (except the one declared pair)", () => {
  assert.ok(files.length >= 90, `discovery floor: found only ${files.length} migration files`);
  const dups = duplicateVersions(files);
  for (const d of dups) console.log(`  ${d.version}: ${d.files.join(", ")}`);
  assert.deepEqual(dups.map((d) => d.version).sort(), [...KNOWN].sort(),
    "a NEW shared version: rename the newer, unapplied migration to a later timestamp and update every place that names it");
});

test("canary: a planted clash is caught", (t) => {
  if (process.env.MIGRATION_CANARY === "off") { t.skip("canary switched off by MIGRATION_CANARY=off"); return; }
  const v = files.filter((f) => f.endsWith(".sql")).sort().at(-1).split("_")[0]; // the newest: never in KNOWN
  const planted = duplicateVersions([...files, `${v}_planted.sql`]).map((d) => d.version);
  assert.ok(planted.includes(v), `a second ${v} file was not reported`);
});
