// ROADMAP 97.12 (S-M2) — HOW MANY LINES IN THE LIVE DATABASE ALREADY BELONG TO A BUSINESS OTHER THAN THEIR
// BOOKING'S? Asked BEFORE `20261017000000_booking_lines_same_business.sql` is applied, because that migration
// refuses to run over a mismatch (it names the counts and stops) and Andrew should know the answer first.
//
//   set -a; . ./.env; set +a
//   node scripts/booking-lines-mismatch.mjs
//
// ROADMAP 97.71 added three more booking pointers, asked before
// `20261017010000_photos_deadlines_same_business.sql` for the same reason: `job_photos.booking_id` and both of
// `maintenance_deadlines`'s booking columns. A deadline with no booking is not joined and so never counted.
//
// ROADMAP 97.72 added the three CUSTOMER pointers a detailer can write, asked before
// `20261017020000_customer_same_business.sql`: `bookings.customer_id`, `plan_members.customer_id` and
// `maintenance_deadlines.customer_id`. `email_sends.customer_id` is counted too but only reported: the browser
// cannot write that table, so the migration gives it no key and its count does not fail the run.
//
// READ-ONLY: ten `select count(*)` through the Management API, the same path `migration-drift.mjs` reads by.
// It refuses any project but this platform's own. Exit 0 = zero mismatches in every column listed; exit 1 = a
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
// [what is printed, table, the column that points at the parent, the parent table, counted toward the exit code]
const TABLES = [
  ["booking_services", "booking_services", "booking_id", "bookings", true],
  ["booking_add_ons", "booking_add_ons", "booking_id", "bookings", true],
  ["booking_line_items", "booking_line_items", "booking_id", "bookings", true],
  ["job_photos", "job_photos", "booking_id", "bookings", true],
  ["maintenance_deadlines.booking_id", "maintenance_deadlines", "booking_id", "bookings", true],
  ["maintenance_deadlines.last_done_booking_id", "maintenance_deadlines", "last_done_booking_id", "bookings", true],
  ["bookings.customer_id", "bookings", "customer_id", "customers", true],
  ["plan_members.customer_id", "plan_members", "customer_id", "customers", true],
  ["maintenance_deadlines.customer_id", "maintenance_deadlines", "customer_id", "customers", true],
  ["email_sends.customer_id (report only)", "email_sends", "customer_id", "customers", false],
];
const cond = BREAK === "count-everything" ? "true" : "b.business_id <> c.business_id";

const sql = TABLES.map(([label, t, col, parent]) => `select '${label}' as tbl,
  (select count(*) from public.${t} where ${col} is not null)::int as total,
  (select count(*) from public.${t} c join public.${parent} b on b.id = c.${col} where ${cond})::int as mismatched`).join(" union all ");

const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query: sql }),
});
const rows = await r.json().catch(() => null);
if (!r.ok || !Array.isArray(rows)) { console.error(`query failed: ${r.status} ${JSON.stringify(rows).slice(0, 200)}`); process.exit(1); }

let bad = 0;
for (const [t, , , parent, counts] of TABLES) {
  const row = rows.find((x) => x.tbl === t);
  if (!row) { console.log(`  ${t}: DID NOT ANSWER`); bad++; continue; }
  console.log(`  ${t}: ${row.mismatched} mismatched of ${row.total} rows naming a ${parent === "bookings" ? "booking" : "customer"}`);
  if (row.mismatched !== 0 && counts) bad++;
}
console.log(`${TABLES.length - bad} of ${TABLES.length} tables clean${BREAK ? ` (--break=${BREAK})` : ""}`);
process.exit(bad ? 1 : 0);
