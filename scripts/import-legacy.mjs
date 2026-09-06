// ROADMAP 5.1 — copy the old site's data into this platform as one business.
//
//   node scripts/import-legacy.mjs --business=<slug>            # dry run
//   node scripts/import-legacy.mjs --business=<slug> --write    # for real
//
// Source:  LEGACY_SUPABASE_URL + LEGACY_SERVICE_KEY   (the old project)
// Target:  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY   (this platform, from .env)
//
// ---------------------------------------------------------------------------
// IT DRY-RUNS BY DEFAULT, AND THAT IS NOT POLITENESS. The roadmap's own words
// are *"test on a copy first"*, and the thing a dry run actually buys is the
// REPORT: how many rows, how many refused and why, and every field that has no
// home. A migration that quietly drops rows is a migration nobody can check
// afterwards, and the moment to read that list is before the write, not after.
//
// THE MAPPING LIVES IN `legacy-map.mjs` AND IS TESTED WITHOUT EITHER DATABASE
// (`tests/legacy-import.test.mjs`, 47 checks). **The source project is not
// reachable from this machine** — the access token in `.env` answers 403 for
// it — so this file's I/O half has never been run, and it is deliberately thin
// for that reason: fetch, transform, insert, count. Everything that could be
// WRONG rather than merely broken is in the module the test can reach.
//
// IDS ARE PRESERVED WHERE BOTH SIDES USE UUIDS — bookings, packages, add-ons,
// promo codes. Two things fall out of that and both are worth having: the run
// is IDEMPOTENT (a second run upserts the same rows rather than doubling the
// history), and **every `/booking/:id` link the old site ever emailed still
// opens the right job here.** `customers.id` was a bigint there and is a uuid
// here, so that one map is built in memory and is why customers must be
// inserted before bookings.
// ---------------------------------------------------------------------------

import { readFileSync } from "node:fs";
import {
  serviceFrom, addOnFrom, isDiscountRow, customerFrom, bookingFrom,
  bookingServicesFrom, promoCodeFrom, expenseFrom, blockoutFrom,
  dropoffPeriodFrom, hoursOverrideFrom, UNMAPPED,
} from "./legacy-map.mjs";

// .env is not exported into this process by default; every other script here
// either loads it or asks for the variables. Same shape as `e2e-booking.mjs`.
try {
  for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
    const i = line.indexOf("=");
    if (i < 1 || line.trim().startsWith("#")) continue;
    const k = line.slice(0, i).trim();
    if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
  }
} catch { /* no .env is fine if the variables are already set */ }

const args = process.argv.slice(2);
const arg = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const WRITE = args.includes("--write");
const SLUG = arg("business");

const { LEGACY_SUPABASE_URL: SRC, LEGACY_SERVICE_KEY: SRC_KEY } = process.env;
const DST = process.env.SUPABASE_URL;
const DST_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SLUG) {
  console.error("--business=<slug> is required: which business on THIS platform the rows belong to.");
  process.exit(1);
}
if (!SRC || !SRC_KEY) {
  console.error(
    "LEGACY_SUPABASE_URL and LEGACY_SERVICE_KEY are not set.\n" +
    "They are the OLD project's URL and service-role key, and they are not in this repo's .env —\n" +
    "the access token here answers 403 for that project. See docs/migration-plan-2026-09-06.md.");
  process.exit(1);
}
if (!DST || !DST_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing from .env.");
  process.exit(1);
}

const rest = (base, key) => async (path, init = {}) => {
  const r = await fetch(`${base}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      "Content-Type": "application/json", Prefer: "return=representation,resolution=merge-duplicates",
      ...(init.headers ?? {}),
    },
  });
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(`${path}: ${r.status} ${JSON.stringify(body)}`);
  return body;
};
const src = rest(SRC, SRC_KEY);
const dst = rest(DST, DST_KEY);

const problems = [];
const counts = {};
const note = (what, n) => { counts[what] = (counts[what] ?? 0) + n; };

// One insert per table, chunked, and a FAILED CHUNK IS REPORTED RATHER THAN
// FATAL — a single historical booking that trips this platform's overlap
// constraint must not abandon the other four hundred. Which rows and why is
// exactly what the dry run is for.
async function insert(table, rows, { onConflict } = {}) {
  if (!rows.length) return [];
  if (!WRITE) { note(table, rows.length); return rows; }
  const out = [];
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200);
    const q = onConflict ? `${table}?on_conflict=${onConflict}` : table;
    try {
      out.push(...(await dst(q, { method: "POST", body: JSON.stringify(chunk) })));
    } catch (e) {
      problems.push(`${table}: a chunk of ${chunk.length} was refused — ${e.message}`);
    }
  }
  note(table, out.length);
  return out;
}

const all = async (table, select = "*") => src(`${table}?select=${select}`);

// ---------------------------------------------------------------------------
const [business] = await dst(`businesses?slug=eq.${encodeURIComponent(SLUG)}&select=id,name,timezone`);
if (!business) {
  console.error(`No business on this platform has the address "${SLUG}". Create it first (/admin → Add a detailer).`);
  process.exit(1);
}
const businessId = business.id;
const timezone = business.timezone;

// THE ONE REFUSAL THAT IS NOT ADVISORY. Importing on top of a business that
// already has bookings is how two histories become one unreadable one, and
// nothing here can tell them apart afterwards.
const existing = await dst(`bookings?business_id=eq.${businessId}&select=id&limit=1`);
if (existing.length && WRITE && !args.includes("--force")) {
  console.error(`"${business.name}" already has bookings. Import into an empty business, or pass --force if you know why.`);
  process.exit(1);
}

console.log(`${WRITE ? "IMPORTING INTO" : "DRY RUN against"} ${business.name} (${SLUG}), timezone ${timezone}\n`);

// IS THE SOURCE ACTUALLY THE OLD SITE? Pointed at the wrong project this
// otherwise fails with a raw PostgREST stack trace naming a table nobody
// typed, which reads as a broken script rather than as a wrong URL.
try {
  await src("packages?select=id&limit=1");
} catch {
  console.error(
    "LEGACY_SUPABASE_URL does not look like the old site: it has no `packages` table.\n" +
    "That is the old catalog, and this importer is written against that schema " +
    "(reference/supabase/migrations/00000000000000_baseline_live_schema.sql).");
  process.exit(1);
}

// 1. The catalog first: bookings point at it.
const packages = await all("packages");
const services = packages.map((p, i) => ({ id: p.id, ...serviceFrom(p, businessId, i) }));
await insert("services", services, { onConflict: "id" });

const legacyAddOns = await all("add_ons");
const realAddOns = legacyAddOns.filter((a) => !isDiscountRow(a));
for (const d of legacyAddOns.filter(isDiscountRow)) {
  problems.push(`add_on "${d.name}" is a DISCOUNT (${d.discount_type} ${d.value}), not an extra — skipped, see the unmapped list`);
}
await insert("add_ons", realAddOns.map((a, i) => ({ id: a.id, ...addOnFrom(a, businessId, i) })), { onConflict: "id" });

await insert("promo_codes", (await all("promo_codes")).map((p) => ({ id: p.id, ...promoCodeFrom(p, businessId) })), { onConflict: "id" });

// 2. Customers, and the bigint → uuid map every booking needs.
const legacyCustomers = await all("customers");
const inserted = await insert("customers", legacyCustomers.map((c) => customerFrom(c, businessId)));
const customerByLegacyId = new Map();
if (WRITE) {
  legacyCustomers.forEach((c, i) => { if (inserted[i]) customerByLegacyId.set(c.id, inserted[i].id); });
}

// 3. The bookings, and their lines.
// A booking's customer is matched by PHONE, because the old bookings table
// stores a denormalised snapshot and no customer id at all. Phone is NOT NULL
// on both sides and is the field that site made mandatory at the form; email
// was optional and is frequently blank on older rows.
const byPhone = new Map();
legacyCustomers.forEach((c) => { if (c.phone) byPhone.set(String(c.phone).replace(/\D/g, ""), c.id); });

const legacyBookings = await all("bookings");
const packageById = new Map(packages.map((p) => [p.id, p]));
const serviceByPackage = new Map(packages.map((p) => [p.id, p.id])); // ids preserved

const bookingRows = [];
for (const b of legacyBookings) {
  const legacyCustomerId = byPhone.get(String(b.customer_phone || "").replace(/\D/g, ""));
  const customerId = legacyCustomerId ? customerByLegacyId.get(legacyCustomerId) ?? null : null;
  if (!customerId && WRITE) {
    problems.push(`booking ${b.id} (${b.booking_date}) has no customer row matching ${b.customer_phone} — imported unlinked`);
  }
  bookingRows.push({ id: b.id, ...bookingFrom(b, { businessId, timezone, customerId }) });
}
await insert("bookings", bookingRows, { onConflict: "id" });

const serviceRows = legacyBookings.flatMap((b) =>
  bookingServicesFrom(b, { businessId, bookingId: b.id, serviceByPackage, packageById }));
await insert("booking_services", serviceRows);

const realAddOnIds = new Set(realAddOns.map((a) => a.id));
const legacyBookingAddOns = await all("booking_add_ons");
await insert("booking_add_ons", legacyBookingAddOns
  .filter((r) => realAddOnIds.has(r.add_on_id))
  .map((r) => ({ id: r.id, business_id: businessId, booking_id: r.booking_id, add_on_id: r.add_on_id, quantity: r.quantity ?? 1, notes: r.notes ?? null })),
  { onConflict: "id" });

// 4. The rest — none of it points at anything above.
await insert("expenses", (await all("expenses")).map((e) => expenseFrom(e, businessId)));
await insert("blockout_dates", (await all("blockout_dates")).map((b) => ({ id: b.id, ...blockoutFrom(b, businessId) })), { onConflict: "id" });
await insert("dropoff_only_periods", (await all("dropoff_only_periods")).map((d) => dropoffPeriodFrom(d, businessId)));
await insert("booking_hours_overrides", (await all("booking_hours_overrides")).map((h) => hoursOverrideFrom(h, businessId)));

// ---------------------------------------------------------------------------
console.log("Rows " + (WRITE ? "written" : "that would be written") + ":");
for (const [table, n] of Object.entries(counts)) console.log(`  ${String(n).padStart(5)}  ${table}`);

console.log("\nWhat has NO home on this platform, and why:");
for (const [what, why] of UNMAPPED) console.log(`  · ${what}\n      ${why}`);

if (problems.length) {
  console.log(`\n${problems.length} row-level note${problems.length === 1 ? "" : "s"}:`);
  for (const p of problems.slice(0, 40)) console.log(`  ! ${p}`);
  if (problems.length > 40) console.log(`  … and ${problems.length - 40} more`);
}

console.log(WRITE
  ? "\nDone. Check the dashboard's Money screen against the old one before telling anybody it worked."
  : "\nDry run — nothing was written. Add --write when the report above reads right.");
