// Applies every SQL file in supabase/migrations/ (in filename order) to the
// platform's dedicated Supabase project via the Management API.
//
// Requires env: SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF
// Usage: node scripts/apply-migrations.mjs
//
// Idempotency note: these are CREATE statements, so re-running against an
// already-migrated database will fail loudly rather than silently mutate —
// that is intentional for Phase 1. A migration-tracking table arrives with
// the Supabase CLI workflow in a later phase.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { SUPABASE_ACCESS_TOKEN, SUPABASE_PROJECT_REF } = process.env;
if (!SUPABASE_ACCESS_TOKEN || !SUPABASE_PROJECT_REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF");
  process.exit(1);
}

// With file arguments, apply only those (for incremental migrations on an
// already-migrated database); with none, apply the whole folder in order.
// fileURLToPath, not .pathname: on Windows .pathname yields "/D:/..." which
// readdir then resolves against the drive as "D:\D:\...". Same bug that
// stopped deploy-functions.mjs running locally.
const dir = fileURLToPath(new URL("../supabase/migrations/", import.meta.url));
const files = process.argv.length > 2
  ? process.argv.slice(2).map((f) => path.basename(f))
  : (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

for (const f of files) {
  const sql = await readFile(path.join(dir, f), "utf8");
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  if (!res.ok) {
    console.error(`FAILED ${f} [${res.status}]`);
    console.error(await res.text());
    process.exit(1);
  }
  console.log(`applied ${f}`);
}
console.log("all migrations applied");
