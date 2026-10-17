// ROADMAP 97.12 (S-M2) — HOW MANY LINES IN THE LIVE DATABASE ALREADY BELONG TO A BUSINESS OTHER THAN THEIR
// BOOKING'S? Asked BEFORE `20261017000000_booking_lines_same_business.sql` is applied, because that migration
// refuses to run over a mismatch (it names the counts and stops) and Andrew should know the answer first.
//
//   set -a; . ./.env; set +a
//   node scripts/booking-lines-mismatch.mjs
//
// READ-ONLY: three `select count(*)` through the Management API, the same path `migration-drift.mjs` reads by.
// It refuses any project but this platform's own. Exit 0 = zero mismatches in all three tables; exit 1 = a
// mismatch, a failed read, or a table that did not answer. A table that did not answer is never counted as zero.
//
// `--break=count-everything` drops the business comparison, so every line with a booking counts as a mismatch;
// on any database holding lines it must go red, which is how a green from the real query is known to have looked.

const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!TOKEN || !REF) {
  console.error("Missing SUPABASE_ACCESS_TOKEN or SUPABASE_PROJECT_REF. Nothing was measured. Run: set -a; . ./.env; set +a");
  process.exit(1);
}
if (REF !== "kguqylyzgyzfktkfnhjb") { console.error(`Refusing: ${REF} is not this platform's database.`); process.exit(1); }

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) ?? "").slice(8);
const TABLES = ["booking_services", "booking_add_ons", "booking_line_items"];
const cond = BREAK === "count-everything" ? "true" : "b.business_id <> c.business_id";

const sql = TABLES.map((t) => `select '${t}' as tbl,
  (select count(*) from public.${t})::int as total,
  (select count(*) from public.${t} c join public.bookings b on b.id = c.booking_id where ${cond})::int as mismatched`).join(" union all ");

const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const rows = await r.json().catch(() => null);
if (!r.ok || !Array.isArray(rows)) { console.error(`query failed: ${r.status} ${JSON.stringify(rows).slice(0, 200)}`); process.exit(1); }

let bad = 0;
for (const t of TABLES) {
  const row = rows.find((x) => x.tbl === t);
  if (!row) { console.log(`  ${t}: DID NOT ANSWER`); bad++; continue; }
  console.log(`  ${t}: ${row.mismatched} mismatched of ${row.total} rows`);
  if (row.mismatched !== 0) bad++;
}
console.log(`${TABLES.length - bad} of ${TABLES.length} tables clean${BREAK ? ` (--break=${BREAK})` : ""}`);
process.exit(bad ? 1 : 0);
