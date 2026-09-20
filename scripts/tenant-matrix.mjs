// THE TENANT-ISOLATION MATRIX — step 6 of ROADMAP.md § "Adopting the
// operating-system report", and the report's own item 2: *"Prove tenant
// isolation as a matrix, at the database boundary, for every tenant-owned
// object. Transformational. A single leak can end the product; UI checks
// cannot prove isolation."*
//
//   node scripts/tenant-matrix.mjs
//   node scripts/tenant-matrix.mjs --keep        # leave the fixtures behind
//   node scripts/receipt.mjs receipts/tenant-matrix.json
//
// Needs `set -a; . ./.env; set +a` and writes to the platform's own database.
//
// ---------------------------------------------------------------------------
// WHY THIS EXISTS WHEN `tests/tenant-isolation.test.mjs` ALREADY PASSES 45/0
// ---------------------------------------------------------------------------
// That suite is good and it is not a matrix. **It asks the leak question of
// FIVE tables** — bookings, customers, expenses, promo_codes,
// business_settings — and the anonymous question of five. This schema has
// **38 tables carrying a `business_id`**. So thirty-three tenant-owned tables
// have never once been asked whether one detailer can read another's rows.
//
// They are not missing from the RUN. They are missing from the QUESTION, which
// is this repo's most expensive and most repeated failure: five defects in
// `sweep-widths.mjs`, two gear screens, eleven dialogs, a booking step. Every
// one was a thing nobody had thought to ask about, sitting inside a check that
// printed clean.
//
// **SO THE QUESTION COMES OFF THE SCHEMA, NOT OFF A LIST.** Every table in
// `public` is discovered at run time and classified by what the database says
// about it, not by what somebody remembered to type here. A new table with a
// `business_id` and no recipe FAILS THE RUN by name. It cannot be added
// quietly and it cannot be forgotten.
//
// ---------------------------------------------------------------------------
// THE INVARIANT, AND WHY IT IS NARROWER THAN "AUTHORIZATION"
// ---------------------------------------------------------------------------
// This file asserts ONE thing, universally:
//
//   **No actor of tenant A may read, change or delete ANY row of tenant B, in
//   any table, by any route — and no actor may create a row owned by B.**
//
// It deliberately does NOT assert who may do what inside their own tenant.
// Whether staff may delete an expense is an AUTHORIZATION question, it varies
// per table by design, and `tests/staff-roles.test.mjs` owns it. Mixing the
// two is how an isolation suite grows a per-table policy spec that nobody
// maintains and that fails for reasons which have nothing to do with leaks.
//
// The narrow invariant needs no per-table knowledge, which is exactly why it
// can be asked of all 38 tables instead of five.
//
// ---------------------------------------------------------------------------
// COUNT SUBJECTS EVERY RUN — THE HOLLOW HALF
// ---------------------------------------------------------------------------
// `docs/hollow-checks-2026-09-13.md` caught `tenant-isolation` test 5 asking
// "does A see any B rows?" of a tenant that owned **zero** bookings, customers
// and expenses. Five greens that had never compared a row. A policy denying A
// everything passed identically to a correct one.
//
// So every deny assertion here carries its own subject count and **both halves
// must be non-zero**: B must own a row for A to fail to see, and A must own a
// row to prove the read worked at all. A table where either is zero is a
// DECLARED SKIP with a probe, never a silent pass.
//
// ---------------------------------------------------------------------------
// THE CANARY — A REAL TABLE WITH A REAL HOLE, MADE AND DESTROYED IN ONE RUN
// ---------------------------------------------------------------------------
// The report: *"Add a canary in an ephemeral database that deliberately
// weakens one policy; the isolation suite must fail. If it does not, the suite
// is not certified."*
//
// `public.tenant_matrix_canary` is created at the start of every run with RLS
// **on** and one deliberately broken policy — `for select to authenticated
// using (true)` — seeded with one row for A and one for B, and dropped in a
// `finally` so a crash cannot leave it behind. It is discovered by the same
// schema query as everything else, so it goes through the identical code path
// as a real table.
//
// **The matrix MUST report it as a leak.** If the canary comes back clean the
// run says every green line above it is void and exits non-zero. A negative
// control that is handled specially proves nothing; this one is only special
// in that it is expected to fail.

import { mkdirSync, writeFileSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";

const KEEP = process.argv.includes("--keep");
// SABOTAGE SWITCHES — how this file was certified rather than believed.
//   --break=canary    do not create the leaky table  -> the receipt refuses the run
//   --break=leak      stop comparing business_id     -> the canary survives
//   --break=sentinel  stop looking for B's secret    -> the sentinel half is proved live
//   --break=recipe    forget one table's recipe      -> the no-recipe gate fires
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const started_at = new Date().toISOString();

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
let ANON = process.env.SUPABASE_ANON_KEY;

if (!URL_ || !SERVICE || !TOKEN || !REF) {
  console.error("SKIPPED — needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,");
  console.error("          SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF.");
  console.error("          Nothing was measured. Run: set -a; . ./.env; set +a");
  console.error("          Exiting 1 so this cannot be mistaken for a clean matrix.");
  process.exit(1);
}

// **THE PROJECT GUARD, AND IT IS NOT CEREMONY.** This file CREATES AND DROPS A
// TABLE. CLAUDE.md § Hard rules names `adtlnvihwrcqcasqcjwd` as the presumed
// real business database and says to stop and ask on any project that is not
// the platform's own. A ref typed into an env file is exactly how that goes
// wrong at 1am, so the allowed project is named here, in the file that does
// the damage.
const ALLOWED = "kguqylyzgyzfktkfnhjb";
if (REF !== ALLOWED) {
  console.error(`REFUSING — this script writes DDL and ${REF} is not ${ALLOWED}.`);
  console.error("          CLAUDE.md § Hard rules: stop and ask on any other project.");
  process.exit(2);
}

if (!ANON) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${TOKEN}` } },
  );
  const keys = await res.json();
  ANON = keys.find((k) => k.name === "anon")?.api_key
    ?? keys.find((k) => k.type === "publishable")?.api_key;
  if (!ANON) { console.error("No anon key for project"); process.exit(1); }
}

// ---------------------------------------------------------------------------
// plumbing
// ---------------------------------------------------------------------------

const sql = async (text) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : [];
};

async function rest(method, path, { key = SERVICE, jwt, body, prefer } = {}) {
  const r = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, data, text };
}

const svc = {
  get: (p) => rest("GET", p),
  post: (p, b) => rest("POST", p, { body: b }),
  del: (p) => rest("DELETE", p),
};

async function ensureUser(email, password) {
  await rest("POST", "/auth/v1/admin/users", { body: { email, password, email_confirm: true } });
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const s = await r.json();
  if (!s.access_token) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(s).slice(0, 200)}`);
  return { id: s.user.id, jwt: s.access_token };
}

const failures = [];
const rows = [];
const skips = [];
let assertions = 0;
const say = (m) => { failures.push(m); };
const assert = (ok, message) => { assertions++; if (!ok) say(message); return ok; };

// ---------------------------------------------------------------------------
// 1 · DISCOVERY. The question comes off the schema.
// ---------------------------------------------------------------------------

const CANARY = "tenant_matrix_canary";

// **THE GRANT DECIDES WHETHER A BROWSER CAN READ A TABLE, NOT THE POLICY.**
// Postgres checks the GRANT first; RLS never gets a say on a table the role
// cannot select from at all. Counting policies therefore answers a different
// question from the one that matters, and it is wrong on exactly one table in
// this schema — see `connected_accounts` below.
const discoverTables = () => sql(`
  select c.relname as t,
         (select count(*) from pg_policy p where p.polrelid = c.oid) as policies,
         coalesce((select array_agg(a.attname order by a.attnum)
                     from pg_attribute a
                    where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                      and has_column_privilege('authenticated', c.oid, a.attname, 'SELECT')),
                  '{}') as auth_cols,
         coalesce((select array_agg(a.attname order by a.attnum)
                     from pg_attribute a
                    where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
                      and has_column_privilege('anon', c.oid, a.attname, 'SELECT')),
                  '{}') as anon_cols,
         (select count(*) from pg_attribute a
           where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped) as ncols,
         exists (select 1 from pg_attribute a
                  where a.attrelid = c.oid and a.attname = 'business_id'
                    and a.attnum > 0 and not a.attisdropped) as has_biz
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
   order by 1`);

// THE SEED RECIPES — the columns a row needs beyond `business_id`, per table,
// taken from the schema's own NOT NULL-without-a-default list rather than from
// reading the app. `null` means "no extra columns needed".
//
// **A TENANT TABLE WITH NO RECIPE FAILS THE RUN.** That is the whole point:
// the next migration that adds a tenant-owned table cannot slip past this file
// in silence, the way two gear screens and eleven dialogs slipped past
// `sweep-widths.mjs` by simply not being in anybody's list.
const S = (tag) => `TENANT-${tag}-SECRET`;
const RECIPES = {
  add_ons: (t) => ({ name: `${S(t)} add-on` }),
  blockout_dates: (t) => ({ event_name: `${S(t)} closure`, start_date: "2027-03-01", end_date: "2027-03-02" }),
  booking_add_ons: (t, ids) => ({ booking_id: ids.booking }),
  booking_hours_overrides: () => ({ date: "2027-03-05" }),
  booking_line_items: (t, ids) => ({ booking_id: ids.booking, category: "service", label: `${S(t)} line` }),
  booking_services: (t, ids) => ({ booking_id: ids.booking, name_at_booking: `${S(t)} service` }),
  // position >= 2 — car 1 IS the booking; the table only holds the extras.
  booking_vehicles: (t, ids) => ({ booking_id: ids.booking, position: 2, vehicle_size: "sedan", vehicle_size_label: `${S(t)} sedan` }),
  bookings: (t) => ({ customer_name: `${S(t)} customer`, customer_phone: "555-0000", start_at: "2027-03-10T17:00:00Z", end_at: "2027-03-10T19:00:00Z", service_type: "mobile" }),
  business_branding: () => ({}),
  business_domains: (t) => ({ domain: `${t.toLowerCase()}-matrix.example` }),
  business_hours: () => ({ weekday: 3 }),
  business_invites: (t) => ({ email: `${t.toLowerCase()}-invite@matrix.test` }),
  business_settings: () => ({}),
  // A user of its own: the actors are already members, and (business_id,
  // user_id) is unique, so reusing one is a 409 rather than a fixture.
  business_users: (t, ids) => ({ user_id: ids.spareUser, role: "staff" }),
  campaign_visits: () => ({}),
  campaigns: (t) => ({ slug: `${t.toLowerCase()}-matrix`, name: `${S(t)} campaign` }),
  connected_accounts: () => ({}),
  customers: (t) => ({ name: `${S(t)} client`, phone: "555-0001" }),
  dropoff_only_periods: () => ({ start_date: "2027-03-15" }),
  email_sends: (t) => ({ to_email: `${t.toLowerCase()}@matrix.test`, subject: `${S(t)} subject` }),
  expenses: (t) => ({ date: "2027-03-01", category: "supplies", description: `${S(t)} towels`, amount: 12, payment_method: "cash" }),
  gallery_images: () => ({}),
  job_photos: (t, ids) => ({ booking_id: ids.booking, kind: "after", path: `${t.toLowerCase()}/matrix.jpg`, bytes: 1024 }),
  maintenance_deadlines: (t, ids) => ({ customer_id: ids.customer, label: `${S(t)} deadline`, due_on: "2027-04-01" }),
  message_templates: (t) => ({ key: `matrix_${t.toLowerCase()}`, label: `${S(t)} template`, body: `${S(t)} body` }),
  owner_daily_digest_state: () => ({ digest_date: "2027-03-01" }),
  owner_push_subscriptions: (t, ids) => ({ user_id: ids.owner, endpoint: `https://matrix.test/${t}`, p256dh: "x", auth: "y" }),
  plan_members: (t, ids) => ({ plan_id: ids.plan, customer_id: ids.customer }),
  plan_visits: (t, ids) => ({ member_id: ids.planMember, kind: "granted", delta: 1, due_on: "2027-04-01" }),
  plans: (t) => ({ name: `${S(t)} plan` }),
  platform_admin_events: (t, ids) => ({ admin_id: ids.owner, action: `matrix_${t.toLowerCase()}` }),
  platform_invoices: (t, ids) => ({ id: `matrix_${t.toLowerCase()}_${ids.stamp}`, amount_cents: 500, status: "paid" }),
  platform_subscriptions: () => ({ plan: "booking", term: "monthly", recurring_cents: 2900, bill_interval: "month" }),
  promo_codes: (t) => ({ code: `MATRIX${t}`, type: "percentage", value: 5 }),
  service_groups: (t) => ({ name: `${S(t)} group` }),
  services: (t) => ({ name: `${S(t)} service`, price: 100, duration_minutes: 60 }),
  site_intake: () => ({}),
  testimonials: (t) => ({ author: `${S(t)} author`, quote: `${S(t)} quote` }),
  // source_hash is CHECKed against ^[0-9a-f]{64}$ and the row must carry a
  // translation, not just a source.
  translations: (t) => ({ lang: "es", source_hash: (t === "A" ? "a" : "b").repeat(64),
    source_text: `${S(t)} text`, machine_text: `${S(t)} texto`, machine_by: "google" }),
  [CANARY]: (t) => ({ note: `${S(t)} canary row` }),
};

// The order rows must be made in, because some carry a foreign key to another.
const ORDER = [
  "business_settings", "business_branding", "business_hours", "services", "service_groups",
  "add_ons", "customers", "plans", "plan_members", "plan_visits", "bookings",
  "booking_services", "booking_add_ons", "booking_line_items", "booking_vehicles",
  "job_photos", "maintenance_deadlines", "campaigns", "campaign_visits", "promo_codes",
  "expenses", "blockout_dates", "booking_hours_overrides", "dropoff_only_periods",
  "business_domains", "business_invites", "business_users", "connected_accounts",
  "email_sends", "gallery_images", "message_templates", "owner_daily_digest_state",
  "owner_push_subscriptions", "platform_admin_events", "platform_invoices",
  "platform_subscriptions", "site_intake", "testimonials", "translations", CANARY,
];

// ---------------------------------------------------------------------------

let canaryPresent = false;
const PASSWORD = "Matrix-isolation-test-pw!";

async function makeCanary() {
  await sql(`drop table if exists public.${CANARY} cascade`);
  await sql(`create table public.${CANARY} (
      id uuid primary key default gen_random_uuid(),
      business_id uuid not null references public.businesses(id) on delete cascade,
      note text)`);
  await sql(`alter table public.${CANARY} enable row level security`);
  // THE HOLE. `using (true)` means every signed-in user reads every row.
  await sql(`create policy ${CANARY}_leak on public.${CANARY}
             for select to authenticated using (true)`);
  await sql(`grant select on public.${CANARY} to authenticated`);
  canaryPresent = true;
}

async function dropCanary() {
  if (!canaryPresent) return;
  await sql(`drop table if exists public.${CANARY} cascade`);
  canaryPresent = false;
}

// ---------------------------------------------------------------------------

let tenantTables = [], lockedTables = [], otherTables = [], inertPolicy = [], columnLimited = [];
// What a browser is actually allowed to ask for, per table. `*` where every
// column is granted; an explicit list where they are handed out one at a time.
const SELECT_COLS = {};
let A, B, ownerA, ownerB, staffA, formerA, spareA, spareB;
const seeded = { A: {}, B: {} };
const canaryFindings = [];
let canaryDetectors = [];

try {
  console.log("1 · discovery");
  if (BREAK !== "canary") await makeCanary();
  const all = await discoverTables();
  // **POLICY COUNT DECIDES FIRST, NOT `business_id`.** `platform_admin_events`
  // carries a business_id AND has zero policies, on purpose — db-audit.mjs
  // calls that the strongest statement available, so a detailer cannot forge
  // an audit row. Classing it as tenant-owned made the matrix demand that
  // owner A read its own rows there, which is the one thing that table exists
  // to prevent. It belongs with the locked tables and is asserted as one.
  // **BOTH, AND THE FIRST ATTEMPT USED ONLY ONE OF THEM.** A browser reads a
  // table only if the role holds the GRANT *and* a policy lets the row
  // through. Either alone is a denial, and the two denials look identical from
  // outside while being opposite inside:
  //   grant, no policy   — `platform_admin_events`, RLS forced with nothing to
  //                        unlock it. The deliberate lock db-audit.mjs names.
  //   policy, no grant   — `connected_accounts`, where the policy is inert and
  //                        the grant is what is actually holding the door.
  // Keying on policies alone made the matrix demand that owner A read its own
  // audit rows; keying on the grant alone made it demand the same thing one
  // table over. The conjunction is the question.
  // **AND THE GRANT MAY BE PER COLUMN, WHICH `has_table_privilege` CANNOT
  // SEE.** It answers false for a table whose columns are granted one at a
  // time, so the first version of this file called `connected_accounts`
  // unreachable and reported its policy as inert. It is neither.
  // `20260908001000_connected_accounts.sql` revokes the table and hands back
  // five columns by name, deliberately withholding `connect_state` — "a value
  // nobody can read is a value nobody can leak". The policy fires normally for
  // the five. Asking `select=*` of such a table is refused for the columns,
  // not the rows, and that refusal reads exactly like a denial.
  // `array_agg` arrives from the Management API as a Postgres array LITERAL —
  // the string `{business_id,stripe_account_id}` — not as a JSON array.
  const arr = (v) => Array.isArray(v) ? v
    : (typeof v === "string" ? v.replace(/^{|}$/g, "").split(",").filter(Boolean) : []);
  const cols = (t) => arr(t.auth_cols).length ? arr(t.auth_cols) : arr(t.anon_cols);
  const reachable = (t) => cols(t).length > 0 && Number(t.policies) > 0;
  tenantTables = all.filter((t) => t.has_biz && reachable(t)).map((t) => t.t);
  lockedTables = all.filter((t) => !reachable(t)).map((t) => t.t);
  otherTables = all.filter((t) => !t.has_biz && reachable(t)).map((t) => t.t);

  // **AN INERT POLICY IS A TRAP, NOT A COMFORT.** A table no browser role can
  // select from is safe today whatever its policies say — but a policy sitting
  // on it reads, to the next person, as the thing keeping it safe. It is not.
  // One `grant select to authenticated` and that policy is suddenly the whole
  // of the protection. Reported every run, by name, with its policy count.
  inertPolicy = all.filter((t) => !reachable(t) && Number(t.policies) > 0)
    .map((t) => `${t.t} (${t.policies} policy/policies, no browser grant at all)`);
  for (const t of inertPolicy) console.log(`    INERT POLICY — ${t}`);

  // Column-limited tables are NOT a finding — they are a stronger posture than
  // a plain table grant, and the withheld columns are the point. Named every
  // run so the shape stays visible rather than being rediscovered as a bug.
  columnLimited = all.filter((t) => reachable(t) && cols(t).length < Number(t.ncols))
    .map((t) => `${t.t}: ${cols(t).length} of ${t.ncols} columns readable, withheld = `
      + (t.withheld = "see the migration"));
  for (const t of all.filter((x) => reachable(x) && cols(x).length < Number(x.ncols))) {
    console.log(`    COLUMN-LIMITED — ${t.t}: ${cols(t).length} of ${t.ncols} columns granted to a browser`);
  }
  for (const t of all) SELECT_COLS[t.t] = cols(t).length === Number(t.ncols) ? "*" : cols(t).join(",");
  console.log(`    ${all.length} tables — ${tenantTables.length} tenant-owned, `
    + `${lockedTables.length} locked (no policies), ${otherTables.length} shared with policies`);

  // THE GATE THAT MAKES DISCOVERY MEAN SOMETHING.
  if (BREAK === "recipe") delete RECIPES.customers;
  const noRecipe = tenantTables.filter((t) => !RECIPES[t]);
  for (const t of noRecipe) {
    say(`${t}: tenant-owned and has no seed recipe — it has never been asked about`);
  }
  if (noRecipe.length) console.log(`    ${noRecipe.length} tenant table(s) with NO RECIPE: ${noRecipe.join(", ")}`);

  console.log("\n2 · actors and fixtures");
  spareA = await ensureUser("matrix-spare-a@isolation.test", PASSWORD);
  spareB = await ensureUser("matrix-spare-b@isolation.test", PASSWORD);
  ownerA = await ensureUser("matrix-owner-a@isolation.test", PASSWORD);
  ownerB = await ensureUser("matrix-owner-b@isolation.test", PASSWORD);
  staffA = await ensureUser("matrix-staff-a@isolation.test", PASSWORD);
  formerA = await ensureUser("matrix-former-a@isolation.test", PASSWORD);

  await svc.del("/rest/v1/businesses?slug=in.(matrix-tenant-a,matrix-tenant-b)");
  const biz = await svc.post("/rest/v1/businesses", [
    { is_demo: true, slug: "matrix-tenant-a", name: "MATRIX TEST TENANT A", timezone: "America/Los_Angeles" },
    { is_demo: true, slug: "matrix-tenant-b", name: "MATRIX TEST TENANT B", timezone: "America/New_York" },
  ]);
  if (biz.status !== 201) throw new Error(`fixture businesses: ${biz.status} ${JSON.stringify(biz.data).slice(0, 200)}`);
  A = biz.data.find((b) => b.slug === "matrix-tenant-a");
  B = biz.data.find((b) => b.slug === "matrix-tenant-b");

  await svc.post("/rest/v1/business_users", [
    { business_id: A.id, user_id: ownerA.id, role: "owner" },
    { business_id: B.id, user_id: ownerB.id, role: "owner" },
    { business_id: A.id, user_id: staffA.id, role: "staff" },
    { business_id: A.id, user_id: formerA.id, role: "staff" },
  ]);

  // Seed both tenants, in dependency order, recording what landed.
  for (const [tag, biz_] of [["A", A], ["B", B]]) {
    const ids = { stamp: Date.now() + tag, owner: tag === "A" ? ownerA.id : ownerB.id,
                  spareUser: tag === "A" ? spareA.id : spareB.id };
    for (const table of ORDER) {
      if (!RECIPES[table]) continue;
      if (!tenantTables.includes(table)) continue;
      let extra;
      try { extra = RECIPES[table](tag, ids); } catch { extra = null; }
      if (!extra) continue;
      const r = await svc.post(`/rest/v1/${table}`, [{ business_id: biz_.id, ...extra }]);
      if (r.status === 201 && Array.isArray(r.data) && r.data[0]) {
        seeded[tag][table] = r.data[0];
        if (table === "bookings") ids.booking = r.data[0].id;
        if (table === "customers") ids.customer = r.data[0].id;
        if (table === "plans") ids.plan = r.data[0].id;
        if (table === "plan_members") ids.planMember = r.data[0].id;
      } else {
        seeded[tag][table] = null;
        skips.push(`${tag}/${table}: could not seed — ${r.status} ${JSON.stringify(r.data).slice(0, 110)}`);
      }
    }
    console.log(`    tenant ${tag}: ${Object.values(seeded[tag]).filter(Boolean).length} of ${ORDER.filter((t) => tenantTables.includes(t)).length} tables seeded`);
  }

  // Former member: signed in WHILE a member, then removed. The JWT is still
  // valid; the membership is not. Policies read `current_business_ids()` live,
  // so access must end the moment the row goes, not when the token expires.
  await svc.del(`/rest/v1/business_users?business_id=eq.${A.id}&user_id=eq.${formerA.id}`);

  // ---------------------------------------------------------------------------
  console.log("\n3 · the matrix");
  const ACTORS = [
    { name: "anon", key: ANON, jwt: ANON, ownRows: false },
    { name: "owner A", key: ANON, jwt: ownerA.jwt, ownRows: true },
    { name: "staff A", key: ANON, jwt: staffA.jwt, ownRows: false },
    { name: "former A", key: ANON, jwt: formerA.jwt, ownRows: false },
  ];

  for (const table of tenantTables) {
    const bRow = seeded.B[table];
    const aRow = seeded.A[table];

    // COUNT SUBJECTS. A deny assertion over a table where B owns nothing has
    // compared nothing, and reads exactly like a correct policy.
    const bCount = (await svc.get(`/rest/v1/${table}?business_id=eq.${B.id}&select=business_id`)).data?.length ?? 0;
    if (!bRow || bCount === 0) {
      skips.push(`${table}: B owns no row, so "A cannot see B" compared nothing`);
      rows.push({ table, verdict: "SKIPPED — no B subject", detail: "" });
      console.log(`    ${table.padEnd(28)} SKIPPED — no B subject`);
      continue;
    }

    // **EVERY FINDING CARRIES THE DETECTOR THAT MADE IT, and the first version
    // did not.** The canary trips several detectors at once — a table with
    // `using (true)` leaks to owner A AND to a former member AND spills the
    // sentinel — so "the canary was caught" was true even with the leak
    // comparison switched off, and `--break=leak` passed. A negative control
    // that can be caught by the wrong detector certifies nothing. The canary
    // now has to be caught by the LEAK detector specifically.
    const problems = [];
    const flag = (det, msg) => problems.push({ det, msg });
    for (const actor of ACTORS) {
      const r = await rest("GET", `/rest/v1/${table}?select=${SELECT_COLS[table] ?? "*"}`,
        { key: actor.key, jwt: actor.jwt });
      const got = Array.isArray(r.data) ? r.data : [];
      const leaked = got.filter((x) => x.business_id === B.id);
      assertions++;
      if (BREAK !== "leak" && leaked.length) flag("leak", `${actor.name} READ ${leaked.length} of B's rows`);

      // THE SENTINEL. Not "did a business_id come back" but "did B's secret
      // text come back", which catches a leak through a view, a join or a
      // column this file does not know the name of.
      assertions++;
      if (BREAK !== "sentinel" && r.text && r.text.includes(S("B"))) flag("sentinel", `${actor.name} saw B's sentinel string in the response body`);

      if (actor.ownRows) {
        assertions++;
        if (!got.some((x) => x.business_id === A.id)) {
          flag("subjects", `${actor.name} sees none of its OWN rows — this table's deny half compared nothing`);
        }
      }
      if (actor.name === "former A") {
        assertions++;
        if (got.length) flag("former", `former A still reads ${got.length} row(s) after the membership was deleted`);
      }
    }

    // WRITES, by B's real primary key. A forged id is the attack; a matched
    // row is the leak.
    const pk = bRow.id;
    if (pk !== undefined) {
      const upd = await rest("PATCH", `/rest/v1/${table}?id=eq.${pk}`, { key: ANON, jwt: ownerA.jwt, body: {} });
      assertions++;
      if (Array.isArray(upd.data) && upd.data.length) flag("update", `owner A UPDATED ${upd.data.length} of B's rows`);

      const del = await rest("DELETE", `/rest/v1/${table}?id=eq.${pk}`, { key: ANON, jwt: ownerA.jwt });
      assertions++;
      if (Array.isArray(del.data) && del.data.length) flag("delete", `owner A DELETED ${del.data.length} of B's rows`);

      const still = await svc.get(`/rest/v1/${table}?id=eq.${pk}&select=business_id`);
      assertions++;
      if (!still.data?.length) flag("delete", "B's row is GONE after A tried to delete it");
    }

    // FORGED TENANCY. A near-copy of B's own row, which is guaranteed schema
    // valid, posted as A with B's business_id.
    const forged = { ...bRow, business_id: B.id };
    delete forged.id; delete forged.created_at; delete forged.updated_at;
    const ins = await rest("POST", `/rest/v1/${table}`, { key: ANON, jwt: ownerA.jwt, body: forged });
    assertions++;
    if (ins.status === 201) flag("insert", "owner A CREATED a row owned by B");

    if (table === CANARY) {
      canaryFindings.push(...problems.map((x) => `[${x.det}] ${x.msg}`));
      canaryDetectors = [...new Set(problems.map((x) => x.det))];
      const byLeak = problems.some((x) => x.det === "leak");
      rows.push({ table, verdict: byLeak ? "caught (canary)" : "MISSED (canary)", detail: problems.map((x) => x.msg).join("; ") });
      console.log(`    ${table.padEnd(28)} ${byLeak ? "canary caught by [leak] (+ " + canaryDetectors.filter((d) => d !== "leak").join(", ") + ")" : "CANARY NOT CAUGHT BY THE LEAK DETECTOR"}`);
      continue;
    }

    for (const x of problems) say(`${table}: [${x.det}] ${x.msg}`);
    rows.push({ table, verdict: problems.length ? "LEAK" : "ok", detail: problems.map((x) => x.msg).join("; ") });
    console.log(`    ${table.padEnd(28)} ${problems.length ? "LEAK — " + problems.map((x) => x.msg).join("; ") : "ok"}`);
  }

  // The locked tables: RLS forced, no policies, nobody in a browser reads them.
  console.log("\n4 · the locked tables (no policies by design)");
  for (const table of lockedTables) {
    let bad = 0;
    for (const actor of ACTORS) {
      const r = await rest("GET", `/rest/v1/${table}?select=*`, { key: actor.key, jwt: actor.jwt });
      assertions++;
      if (Array.isArray(r.data) && r.data.length) { bad++; say(`${table}: ${actor.name} read ${r.data.length} row(s) from a table with no policies`); }
    }
    rows.push({ table, verdict: bad ? "LEAK" : "ok (locked)", detail: "" });
    console.log(`    ${table.padEnd(28)} ${bad ? "LEAK" : "ok — nobody reads it"}`);
  }
} finally {
  await dropCanary().catch((e) => say("could not drop the canary table: " + e.message));
  if (!KEEP && A && B) await svc.del("/rest/v1/businesses?slug=in.(matrix-tenant-a,matrix-tenant-b)");
}

// ---------------------------------------------------------------------------

const canary = {
  id: `${CANARY} · a table with "using (true)" on select`,
  // CAUGHT BY THE RIGHT DETECTOR, not merely caught.
  observed_failure: canaryDetectors.includes("leak"),
  caught_by: canaryDetectors,
  findings: canaryFindings,
};

mkdirSync(new URL("../artifacts/tenant-matrix/", import.meta.url), { recursive: true });
const art = "artifacts/tenant-matrix/index.html";
writeFileSync(new URL("../" + art, import.meta.url), `<!doctype html><meta charset="utf-8">
<title>Tenant-isolation matrix</title>
<style>body{font:13px/1.55 ui-monospace,SFMono-Regular,monospace;margin:26px;background:#0f1214;color:#e3e8ea}
h1{font-size:17px}td,th{padding:5px 11px;border-bottom:1px solid #232a2e;text-align:left;vertical-align:top}
.LEAK{color:#ff8478}.ok{color:#8fd694}th{color:#8b969c}</style>
<h1>Tenant-isolation matrix — every table in <code>public</code></h1>
<p>${rows.length} tables examined, ${assertions} assertions, ${failures.length} failure(s),
${skips.length} skip(s). Canary ${canary.observed_failure ? "caught" : "MISSED"}.</p>
<table><tr><th>table</th><th>verdict</th><th>detail</th></tr>
${rows.map((r) => `<tr><td>${r.table}</td><td class="${r.verdict.startsWith("ok") ? "ok" : "LEAK"}">${r.verdict}</td><td>${r.detail}</td></tr>`).join("\n")}
</table>`, "utf8");

const expected = rows.length;
const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "tenant-matrix",
  started_at,
  status,
  expected_targets: expected,
  discovered_targets: expected,
  attempted_targets: expected,
  completed_targets: expected,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: 300,
  failures,
  artifacts: [art],
  warnings: [...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []), ...skips],
  dimensions: {
    project: REF,
    actors: ["anon", "owner A", "staff A", "former A"],
    tenant_tables: tenantTables.length,
    locked_tables: lockedTables.length,
    shared_with_policies: otherTables,
    inert_policies: inertPolicy,
    column_limited: columnLimited,
    sabotage: BREAK || null,
  },
  canary,
});

console.log(`\n${status.toUpperCase()} — ${rows.length} tables, ${assertions} assertions, `
  + `${failures.length} failure(s), ${skips.length} skip(s), `
  + (canary.observed_failure ? "canary caught" : "CANARY MISSED")
  + `. Receipt ${path}`);
if (!canary.observed_failure) {
  console.log(`  ${CANARY} was created with "for select to authenticated using (true)"`);
  console.log("  and this matrix did not see the leak. Every clean line above is void.");
}
for (const f of failures.slice(0, 30)) console.log("  · " + f);
if (failures.length > 30) console.log(`  … and ${failures.length - 30} more`);
for (const s of skips.slice(0, 20)) console.log("  skip: " + s);
process.exit(status === "pass" ? 0 : 1);
