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
// **ONE AT A TIME.** Two concurrent runs share one set of canaries and one set
// of fixtures, and each one's `finally` tears down the other's — so the second
// run reports `CANARY NOT CAUGHT` and `owner A cannot download its OWN file`,
// which reads exactly like a blind detector and is not. (Measured 2026-09-20,
// by doing it.) The teardown itself survives the collision: both canaries,
// both buckets, the publication entry and both fixture tenants were verified
// gone afterwards. It is the READING that is destroyed, not the database.
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
//
// ---------------------------------------------------------------------------
// FOUR BOUNDARIES, AND A ROW PROVED ISOLATED IS NOT THE FILE BEHIND IT
// ---------------------------------------------------------------------------
// Sections 3 and 4 ask the leak question of tables; section 5 asks it of the
// definer RPCs. Those are two boundaries and the report asks for four.
// Sections 6 and 7 are the other two, and the reason they are not optional is
// a sentence about one table:
//
//   **`job_photos` can be proved isolated while the image behind every one of
//   its rows has never once been fetched by the wrong tenant.** The row
//   carries a `path`; the bytes live in a storage bucket, behind a completely
//   separate policy on `storage.objects` that nothing above this line reads.
//   A green `job_photos` therefore reads as coverage and is not.
//
// So the same two-tenant fixture is carried into:
//
//   6 · STORAGE OBJECTS — A's actors against B's folder in every bucket,
//       discovered from `storage.buckets` rather than named here. Canary: a
//       private bucket whose select policy is scoped to the bucket and to
//       nothing else, so any signed-in user reads every tenant's files in it.
//       Must be caught by [storage-read].
//
//   7 · REALTIME — the socket. Three questions, because Realtime is three
//       mechanisms wearing one name: which tables stream at all
//       (`supabase_realtime`), whether a subscriber of A receives B's rows,
//       and who may join a channel. Canaries: the canary table is published
//       on purpose and must be caught by [realtime-publication]; a channel
//       with no authorisation on it must be caught by [realtime-broadcast].

import { mkdirSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import { writeReceipt } from "./receipt.mjs";

const KEEP = process.argv.includes("--keep");
// SABOTAGE SWITCHES — how this file was certified rather than believed.
//   --break=canary    do not create the leaky table  -> the receipt refuses the run
//   --break=leak      stop comparing business_id     -> the canary survives
//   --break=sentinel  stop looking for B's secret    -> the sentinel half is proved live
//   --break=recipe    forget one table's recipe      -> the no-recipe gate fires
//   --break=storage   stop comparing the stored bytes -> the bucket canary survives
//   --break=realtime  stop reading what arrived       -> both realtime canaries survive
//   --break=bucket-allowlist  empty the public-bucket list -> business-media reports
//
// AND THE TWO SHARP ONES, because the three above are too blunt to prove the
// thing that actually matters. `--break=storage` silences EVERY storage
// detector at once, so it cannot tell "the canary is gated on [storage-read]"
// from "the canary is gated on whichever detector happens to trip". The
// bucket-wide policy trips three. That is the exact trap section 3's canary
// sprang: it was caught with the leak comparison switched off, and
// `--break=leak` passed.
//   --break=storage-read  silence ONLY the byte comparison -> the canary must
//                         be MISSED although [storage-list] and
//                         [storage-former] still trip on it
//   --break=realtime-pub  silence ONLY the publication detector -> the run
//                         must fail although [realtime-broadcast] is caught
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";

// **THE EXPECTATION COMES FROM THE MIGRATIONS - 2026-09-21, docs/silences.md
// section B.** Until today all four target counts were `rows.length`: this
// check declared it expected exactly as many subjects as it happened to find,
// so it could never come up short - on the one check whose whole job is
// proving detailer A cannot read detailer B's customers.
//
// **AND A CONSTANT MEASURED OFF THE LIVE DATABASE WOULD NOT HAVE FIXED IT.**
// That was tried in `restore-drill.mjs` the same day and ruled out: if a table
// were dropped live the expectation would follow it down and the check still
// could not fail. `supabase/migrations/` is declared, append-only and in the
// repo, so it is what the live schema is supposed to MATCH.
//
// The subject of this file is the table carrying a `business_id`. Measured
// 2026-09-21: the migrations declare **39** of them and `public` holds the
// same 39, set-identical, no renames. Compared BY NAME, so a disagreement says
// WHICH table - a tenant-owned table that exists live and is in no migration
// is exactly how a leak arrives without a review.
const MIGRATIONS = nodePath.join(
  nodePath.dirname(nodePath.dirname(fileURLToPath(import.meta.url))), "supabase", "migrations");
const declaredBizTables = () => {
  const bodies = {};
  const dropped = new Set();
  const altered = new Set();
  for (const f of readdirSync(MIGRATIONS).sort()) {
    if (!f.endsWith(".sql")) continue;
    const src = readFileSync(nodePath.join(MIGRATIONS, f), "utf8");
    for (const m of src.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)\s*\(/gi)) {
      let i = m.index + m[0].length, depth = 1;
      while (i < src.length && depth > 0) {
        if (src[i] === "(") depth++;
        else if (src[i] === ")") depth--;
        i++;
      }
      bodies[m[1].toLowerCase()] = src.slice(m.index + m[0].length, i);
    }
    for (const m of src.matchAll(/drop\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_]+)/gi)) {
      dropped.add(m[1].toLowerCase());
    }
    // A column added later counts the same as one declared in the body.
    for (const m of src.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?([a-z_]+)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?business_id/gi)) {
      altered.add(m[1].toLowerCase());
    }
  }
  const out = new Set();
  for (const [name, body] of Object.entries(bodies)) {
    if (!dropped.has(name)) if (/(^|[^a-zA-Z0-9_])business_id([^a-zA-Z0-9_]|$)/.test(body)) out.add(name);
  }
  for (const name of altered) if (!dropped.has(name)) out.add(name);
  return out;
};
const DECLARED_BIZ = declaredBizTables();
// Counted over the business_id tables only - the RPC, storage and realtime
// boundaries are assertions on the same fixture, not targets of their own.
let bizDiscovered = 0;
let bizAttempted = 0;
let bizCompleted = 0;
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

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// STORAGE VERBS. `rest()` above cannot serve these: it JSON-encodes its body
// and sets `Content-Type: application/json`, and an upload's content type is
// the thing the bucket checks. Both buckets restrict `allowed_mime_types` to
// images, so **the sentinel text is uploaded DECLARED as an image** — storage
// checks the header, not the bytes, and a body of `TENANT-B-SECRET` is what
// makes a cross-tenant download provable rather than inferred from a status
// code. A 200 with somebody else's bytes in it is the leak; a 200 is not.
const putObject = async (bucket, path, text, mime, jwt = SERVICE) => {
  const r = await fetch(`${URL_}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": mime, "x-upsert": "true" },
    body: text,
  });
  return { status: r.status, text: (await r.text()).slice(0, 200) };
};
const getObject = async (bucket, path, jwt) => {
  const r = await fetch(`${URL_}/storage/v1/object/${bucket}/${path}`,
    { headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } });
  return { status: r.status, text: (await r.text()).slice(0, 400) };
};
// **AN EMPTY LIST IS HOW STORAGE SPELLS "DENIED", AND ALSO HOW IT SPELLS
// "NOTHING THERE".** `/object/list` returns `200 []` for both, so this verb
// can never be read on its own — every use of it below is paired with a
// service-role count of what is actually in that folder.
const listObjects = async (bucket, prefix, jwt) => {
  const r = await fetch(`${URL_}/storage/v1/object/list/${bucket}`, {
    method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix, limit: 100 }),
  });
  const t = await r.text();
  let d = null;
  try { d = JSON.parse(t); } catch { /* not json */ }
  return { status: r.status, list: Array.isArray(d) ? d : [], text: t.slice(0, 300) };
};
const delObject = async (bucket, path, jwt) => {
  const r = await fetch(`${URL_}/storage/v1/object/${bucket}/${path}`,
    { method: "DELETE", headers: { apikey: ANON, Authorization: `Bearer ${jwt}` } });
  return { status: r.status, text: (await r.text()).slice(0, 200) };
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
// A STANDING RISK IS NOT A SKIP AND NOT A FAILURE. It is a true thing about
// the product that nothing is doing wrong today and that somebody will walk
// into. It rides on every receipt so it cannot quietly stop being said.
const notes = [];
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
  // **`verified_at` IS NOT DECORATION — IT IS WHAT MAKES THE ROW REACHABLE.**
  // `get_public_business_profile_by_host` and `business_canonical_host` both
  // filter on `d.verified_at is not null`, so an unverified fixture domain
  // made both endpoints answer null and report `ok` having resolved nothing.
  // A fixture that cannot be found is a target that was never tested.
  business_domains: (t) => ({ domain: `${t.toLowerCase()}-matrix.example`,
    verified_at: "2027-01-01T00:00:00Z" }),
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
let rpcCanaryPresent = false;
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
  // **AND IT IS PUBLISHED TO REALTIME ON PURPOSE**, which is section 7a's
  // negative control. `supabase_realtime` carries zero tables today, so a
  // detector that reports "no tenant table streams" would report exactly that
  // whether it was looking or not. Putting the canary in the publication is
  // the one thing that tells those two apart. `drop table ... cascade` takes
  // it back out, and the `finally` drops the table on every path.
  await sql(`alter publication supabase_realtime add table public.${CANARY}`);
  canaryPresent = true;
}

// THE STORAGE CANARY — A REAL BUCKET WITH A REAL HOLE.
// Every genuine policy on `storage.objects` in this project scopes to the
// FIRST FOLDER SEGMENT of the object name, which is the owning business's id:
// `(storage.foldername(name))[1] in (select current_business_ids())`. This one
// scopes to the bucket and stops there — the exact mistake somebody makes at
// 1am when a policy "isn't working" — so every signed-in user reads every
// tenant's files in it. Created and destroyed inside one run, and discovered
// by the same `storage.buckets` query as the real buckets, so it travels the
// identical code path.
const CANARY_BUCKET = "tenant-matrix-canary-bucket";
const CANARY_BUCKET_POLICY = "tenant_matrix_canary_bucket_leak";
let storageCanaryPresent = false;

// **THE BUCKET IS MADE AND UNMADE THROUGH THE STORAGE API, NOT THROUGH SQL.**
// `storage.objects` and `storage.buckets` carry a `protect_delete()` trigger
// that refuses a direct `delete` — *"Direct deletion from storage tables is
// not allowed. Use the Storage API instead."* It is there to stop a row being
// removed while its file stays behind forever, and it fires for a canary
// exactly as it would for a customer's photograph. The POLICY still goes
// through SQL: a policy is not a row of storage data.
const bucketApi = async (method, path, body) => {
  const r = await fetch(`${URL_}/storage/v1${path}`, {
    method,
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, text: (await r.text()).slice(0, 200) };
};

async function makeStorageCanary() {
  await dropStorageCanary();
  const made = await bucketApi("POST", "/bucket", {
    id: CANARY_BUCKET, name: CANARY_BUCKET, public: false, allowed_mime_types: ["image/png"],
  });
  if (made.status >= 300) {
    throw new Error(`could not create the canary bucket: ${made.status} ${made.text}`);
  }
  await sql(`drop policy if exists ${CANARY_BUCKET_POLICY} on storage.objects`);
  await sql(`create policy ${CANARY_BUCKET_POLICY} on storage.objects
             for select to authenticated using (bucket_id = '${CANARY_BUCKET}')`);
  storageCanaryPresent = true;
}

async function dropStorageCanary() {
  await sql(`drop policy if exists ${CANARY_BUCKET_POLICY} on storage.objects`);
  await bucketApi("POST", `/bucket/${CANARY_BUCKET}/empty`, {});
  await bucketApi("DELETE", `/bucket/${CANARY_BUCKET}`);
  storageCanaryPresent = false;
}

const RPC_CANARY_NAME = "tenant_matrix_canary_rpc";

async function makeRpcCanary() {
  // A DEFINER FUNCTION THAT DOES THE ONE THING A DEFINER FUNCTION MUST NOT:
  // it takes a tenant id from its caller and trusts it. RLS is bypassed
  // because it is `security definer`, which is the entire point of this
  // negative control — **the table matrix in section 3 cannot see this and
  // never could**, so a green table matrix beside a broken RPC is exactly the
  // false comfort this section was added to remove.
  const ddl = "create or replace function public." + RPC_CANARY_NAME + "(p_business_id uuid)\n"
    + "  returns setof jsonb language sql security definer set search_path = public as $fn$\n"
    + "    select to_jsonb(c) from public.customers c where c.business_id = p_business_id\n"
    + "  $fn$";
  await sql(ddl);
  // **`create function` GRANTS EXECUTE TO `PUBLIC` BY DEFAULT.** Without this
  // revoke the canary is callable by anon as well, which made it leak to
  // EVERYONE — and the privilege rule below, which asks whether A gets more
  // than a stranger, correctly answered no. A negative control has to break
  // in the one way the detector is meant to see. This is also why
  // `20260913005000_definer_execute_swept.sql` exists for the real functions.
  await sql("revoke execute on function public." + RPC_CANARY_NAME + "(uuid) from public");
  await sql("grant execute on function public." + RPC_CANARY_NAME + "(uuid) to authenticated");
  rpcCanaryPresent = true;
  await reloadSchemaCache();
}

// **POSTGREST KEEPS A SCHEMA CACHE AND A FRESHLY CREATED FUNCTION IS NOT IN
// IT.** Calling one returns `404 PGRST202 … no matches were found in the
// schema cache`, and **a 404 is indistinguishable from "the leak did not
// happen"**. The first run of this section reported CANARY NOT CAUGHT for
// exactly that reason: the negative control was unreachable, not unnoticed.
// Those are different failures and they must never print the same way — an
// unreachable canary means the run proved nothing, where a missed canary
// means the detector is blind.
async function reloadSchemaCache() {
  await sql("notify pgrst, 'reload schema'");
  await new Promise((r) => setTimeout(r, 3000));
}

async function dropRpcCanary() {
  if (!rpcCanaryPresent) return;
  await sql("drop function if exists public." + RPC_CANARY_NAME + "(uuid)");
  rpcCanaryPresent = false;
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
let rpcCanaryDetectors = [];
let storageCanaryDetectors = [];
let rtCanaryDetectors = [];
// Every realtime client opened, so the `finally` can close the sockets. An
// unclosed websocket keeps the process alive and the run never exits.
const rtClients = [];
// Storage objects this run created, so they can be swept whatever happens.
const storagePlanted = [];

try {
  console.log("1 · discovery");
  if (BREAK !== "canary") { await makeCanary(); await makeRpcCanary(); await makeStorageCanary(); }
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

  // **THE DECLARED SUBJECT SET, COMPARED BY NAME.** `CANARY` is ours, made by
  // this run, so it is excluded - it is judged by the canary rule instead.
  // `--break=declared` forgets one declared table, which is what a tenant-owned
  // table arriving in the live schema without a migration looks like from here.
  if (BREAK === "declared") DECLARED_BIZ.delete([...DECLARED_BIZ].sort()[0]);
  const liveBiz = all.filter((t) => t.has_biz).map((t) => t.t).filter((t) => t !== CANARY);
  bizDiscovered = liveBiz.length;
  bizAttempted = liveBiz.length;
  assertions++;
  if (DECLARED_BIZ.size === 0) {
    say("THE MIGRATIONS DECLARED NO business_id TABLES. Either `supabase/migrations/` is "
      + "unreadable or the parser stopped matching, and either way there is no expectation "
      + "to judge anything against. This run proves nothing.");
  }
  assertions++;
  if (bizDiscovered === 0) {
    say("ZERO TENANT-OWNED TABLES WERE DISCOVERED. Nothing carries a `business_id`, so every "
      + "isolation question below compared nothing. This is NOT a clean matrix.");
  }
  if (DECLARED_BIZ.size > 0) {
    const liveSet = new Set(liveBiz);
    const missing = [...DECLARED_BIZ].filter((t) => !liveSet.has(t)).sort();
    const extra = liveBiz.filter((t) => !DECLARED_BIZ.has(t)).sort();
    assertions += 2;
    if (missing.length) {
      say(`${missing.length} table(s) the migrations declare with a \`business_id\` are NOT in `
        + `\`public\`: ${missing.join(", ")}. The live schema does not match the repo, so this `
        + `matrix did not ask about them.`);
    }
    if (extra.length) {
      say(`${extra.length} tenant-owned table(s) exist in \`public\` that NO migration declares: `
        + `${extra.join(", ")}. A table carrying a business_id that arrived without a migration `
        + `has had no review, and that is how a leak gets in.`);
    }
  }

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
    if (table !== CANARY) bizCompleted++;
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
    if (all.some((x) => x.t === table && x.has_biz)) bizCompleted++;
    rows.push({ table, verdict: bad ? "LEAK" : "ok (locked)", detail: "" });
    console.log(`    ${table.padEnd(28)} ${bad ? "LEAK" : "ok — nobody reads it"}`);
  }

  // -------------------------------------------------------------------------
  // 5 · THE DEFINER RPCs — the fourth boundary, and the one where a leak hides
  // -------------------------------------------------------------------------
  // The report asks for four boundaries and sections 3 and 4 above cover one:
  // the Data API against tables. **A `security definer` function bypasses RLS
  // by design** — it runs as its owner, so every policy proved above is simply
  // not consulted. That makes these the most likely place for a leak to
  // survive a green table matrix, and there are 39 of them in this schema.
  //
  // **THE SURFACE IS DISCOVERED, AND THE FILTER IS STRUCTURAL RATHER THAN BY
  // NAME.** 211 functions are executable by a browser role; 192 of them are
  // `btree_gist` internals and trigger bodies. They are excluded by asking
  // whether they belong to an EXTENSION (`pg_depend.deptype = 'e'`) and
  // whether they return `trigger` — not by matching `gbt_%`, which is a
  // spelling and would break the day somebody installs another extension.
  // That leaves **19 real application RPCs**.
  //
  // **THE INVARIANT: AN ACTOR OF A MUST NOT GET MORE OUT OF AN RPC ABOUT B
  // THAN AN ANONYMOUS STRANGER GETS.** That is the rule that needs no
  // per-function specification, and it is the one that handles the public
  // endpoints correctly without naming them: `get_public_business_profile`
  // hands B's services to anybody who asks, including anon, so A receiving
  // them is not a leak — it is the product. The same response reaching A but
  // NOT anon is a privilege A holds over B, and that is the defect.
  //
  // Anon is the baseline rather than a third tenant because it is the weakest
  // possible caller: anything anon can see is public by definition.
  const RPC_CANARY = "tenant_matrix_canary_rpc";

  // THE THREE ENDPOINTS THAT PUBLISH A TENANT'S PROFILE ON PURPOSE. Named,
  // with the reason, because an allowlist nobody has to justify is where
  // defects go to be forgotten — `docs/gotchas.md`. `--break=allowlist` empties
  // it, and all three then report as findings, which is the proof that this
  // list is doing work rather than waving things through.
  const PUBLIC_BY_DESIGN = BREAK === "allowlist" ? {} : {
    get_public_business_profile:
      "the booking page's own profile, fetched by slug before anybody signs in",
    get_public_business_profile_by_host:
      "the same profile resolved by a tenant's custom domain",
    get_business_translations:
      "the booking page's Spanish, fetched before sign-in for the same reason",
  };

  console.log("\n5 · the definer RPCs");
  const fns = await sql(`
    select p.proname, pg_get_function_identity_arguments(p.oid) as args,
           p.prosecdef as definer,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_x,
           has_function_privilege('anon', p.oid, 'EXECUTE') as anon_x
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prokind = 'f'
       and p.prorettype <> 'trigger'::regtype
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
       and (has_function_privilege('authenticated', p.oid, 'EXECUTE')
         or has_function_privilege('anon', p.oid, 'EXECUTE'))
     order by p.proname`);
  console.log(`    ${fns.length} application RPCs a browser can call`);

  // ARGUMENTS ARE BUILT FROM THE PARAMETER'S OWN NAME AND TYPE, and anything
  // this cannot answer is a DECLARED SKIP with its reason rather than a
  // silent pass. A function nobody could call is a function nobody tested.
  const argFor = (name, type) => {
    const n = name.toLowerCase();
    if (/uuid/.test(type)) {
      if (/business/.test(n)) return B.id;               // ← the attack: B's id, called as A
      return B.id;
    }
    if (/^p_slug$/.test(n)) return "matrix-tenant-b";
    // **B'S REAL SEEDED DOMAIN, NOT A PLAUSIBLE-LOOKING STRING.** The first
    // version passed `matrix-tenant-b.example`, which resolves to nothing, so
    // `get_public_business_profile_by_host` answered empty and was reported
    // `ok` having been handed an argument that could never return a tenant.
    // A green line over an endpoint that was never exercised is this repo's
    // signature failure, arriving through the argument rather than the target.
    if (/host/.test(n)) return seeded.B.business_domains?.domain ?? null;
    if (/lang/.test(n)) return "es";
    if (/permission/.test(n)) return "settings";
    if (/timezone/.test(n)) return "America/New_York";
    if (/timestamp/.test(type)) return "2027-03-10T17:00:00Z";
    if (/date/.test(type)) return "2027-03-10";
    if (/text/.test(type)) return "matrix-tenant-b";
    return undefined;                                     // unanswerable → declared skip
  };

  for (const fn of fns) {
    const params = String(fn.args || "").split(",").map((s) => s.trim()).filter(Boolean)
      .map((spec) => {
        const m = spec.match(/^([a-z_][a-z0-9_]*)\s+(.*)$/i);
        return m ? { name: m[1], type: m[2] } : { name: null, type: spec };
      });

    const body = {};
    let unanswerable = null;
    for (const p of params) {
      if (!p.name) { unanswerable = `positional parameter "${p.type}"`; break; }
      const v = argFor(p.name, p.type);
      if (v === undefined) { unanswerable = `${p.name} ${p.type}`; break; }
      body[p.name] = v;
    }
    if (unanswerable) {
      skips.push(`rpc ${fn.proname}: no argument could be synthesised for ${unanswerable}`);
      rows.push({ table: `rpc · ${fn.proname}`, verdict: "SKIPPED — unanswerable argument", detail: unanswerable });
      console.log(`    ${("rpc · " + fn.proname).padEnd(34)} SKIPPED — ${unanswerable}`);
      continue;
    }

    const call = (actor) => rest("POST", `/rest/v1/rpc/${fn.proname}`,
      { key: ANON, jwt: actor, body });

    // THE CANARY HAS TO BE REACHABLE BEFORE IT CAN BE TRUSTED TO FAIL.
    // If it cannot even be called, say THAT, rather than letting it read as
    // a detector that looked and saw nothing.
    if (fn.proname === RPC_CANARY) {
      let reach = await call(ownerA.jwt);
      for (let i = 0; i < 3 && reach.status === 404; i++) {
        await reloadSchemaCache();
        reach = await call(ownerA.jwt);
      }
      if (reach.status === 404) {
        say(`the canary RPC could not be reached at all (404 after 3 schema reloads) — `
          + `it was never given the chance to leak, so this run proves nothing `
          + `about the RPC boundary`);
      }
    }

    const anonRes = await call(ANON);
    const anonSaw = !!(anonRes.text && anonRes.text.includes(S("B")));

    const problems = [];
    const flag = (det, msg) => problems.push({ det, msg });

    for (const [label, jwt] of [["owner A", ownerA.jwt], ["staff A", staffA.jwt], ["former A", formerA.jwt]]) {
      const r = await call(jwt);
      const saw = !!(r.text && r.text.includes(S("B")));

      // THE LEAK: A sees B's own text where a stranger does not.
      assertions++;
      if (BREAK !== "rpc" && saw && !anonSaw) {
        flag("rpc", `${label} got B's data from ${fn.proname}() where anon got none`);
      }

      // **AND THE HOLE THAT RULE LEAVES, WHICH THE CANARY FOUND BY FALLING
      // THROUGH IT.** "A must not get more than a stranger" says nothing
      // about a function that hands B's rows to the stranger too. That is a
      // worse leak, and it passed silently until the canary — briefly
      // executable by `public`, as every new function is — came back clean
      // while visibly returning `TENANT-B-SECRET`.
      //
      // Three endpoints publish a tenant's profile on purpose; they are the
      // booking page. Every OTHER function returning a tenant's own text to
      // an anonymous caller is a finding. The allowlist is three names with
      // reasons and `--break=allowlist` proves it is refusable.
      assertions++;
      if (BREAK !== "rpc" && anonSaw && !PUBLIC_BY_DESIGN[fn.proname]) {
        flag("rpc", `${fn.proname}() hands B's own data to an ANONYMOUS caller, `
          + `and it is not one of the endpoints that publish a profile on purpose`);
      }

      // THE PREDICATE: a definer `is_*`/`has_*` asked about B must not answer
      // true to somebody who has no relationship with B. This is the shape
      // that leaks a fact rather than a row — "are you the owner of that
      // business" answered yes is an authorisation bug with no data in it.
      if (fn.definer && /^(is_|has_)/.test(fn.proname)) {
        assertions++;
        if (BREAK !== "rpc" && (r.data === true || r.text === "true")) {
          flag("rpc-predicate", `${label} got true from ${fn.proname}() about B`);
        }
      }
    }

    if (fn.proname === RPC_CANARY) {
      canaryFindings.push(...problems.map((x) => `[${x.det}] ${x.msg}`));
      rpcCanaryDetectors = [...new Set(problems.map((x) => x.det))];
      const byRpc = problems.some((x) => x.det === "rpc");
      rows.push({ table: `rpc · ${fn.proname}`, verdict: byRpc ? "caught (canary)" : "MISSED (canary)",
                  detail: problems.map((x) => x.msg).join("; ") });
      console.log(`    ${("rpc · " + fn.proname).padEnd(34)} `
        + (byRpc ? `canary caught by [rpc]` : "CANARY NOT CAUGHT BY THE RPC DETECTOR"));
      if (!byRpc) {
        // A canary that comes back clean is a diagnosis, not a verdict. Print
        // what it actually answered, or the next person repeats the twenty
        // minutes this cost.
        const raw = await call(ownerA.jwt);
        console.log(`      it was called with ${JSON.stringify(body)}`);
        console.log(`      owner A got ${raw.status}: ${String(raw.text).slice(0, 200)}`);
        console.log(`      anon got ${anonRes.status}: ${String(anonRes.text).slice(0, 120)}`);
      }
      continue;
    }

    for (const x of problems) say(`rpc ${fn.proname}: [${x.det}] ${x.msg}`);
    rows.push({ table: `rpc · ${fn.proname}`, verdict: problems.length ? "LEAK" : "ok",
                detail: problems.map((x) => x.msg).join("; ") });
    console.log(`    ${("rpc · " + fn.proname).padEnd(34)} `
      + (problems.length ? "LEAK — " + problems.map((x) => x.msg).join("; ")
                         : `ok${anonSaw ? "  (public by design — anon sees it too)" : ""}`));
  }

  // -------------------------------------------------------------------------
  // 6 · STORAGE OBJECTS — the file behind the row
  // -------------------------------------------------------------------------
  // `job_photos` passed section 3. That proves a detailer cannot read another
  // detailer's photo ROWS. The photographs are not in those rows — the row
  // holds a `path` and the bytes sit in the `job-photos` bucket behind a
  // policy on `storage.objects` that nothing above this line has read. The
  // two are enforced by different rules in different schemas and one being
  // right has never implied the other.
  //
  // **BUCKETS ARE DISCOVERED, NOT NAMED.** Same reason as the tables: the
  // bucket somebody adds next month must be asked the question without
  // anybody remembering to add it here.
  //
  // THE INVARIANT IS THE RPC SECTION'S, WORD FOR WORD: an actor of A must not
  // get more out of B's folder than an anonymous stranger gets. That is what
  // handles `business-media` correctly without special-casing it —
  // a tenant's logo is served to the whole internet on purpose, so A seeing it
  // is the product, and A seeing what anon cannot is the defect.
  const PUBLIC_BUCKETS_BY_DESIGN = BREAK === "bucket-allowlist" ? {} : {
    "business-media":
      "the tenant's own logo, hero and published gallery images — the booking "
      + "page and the tenant's website serve them to anybody, signed in or not",
  };

  console.log("\n6 · storage objects");
  const buckets = await sql(`select id, public, allowed_mime_types from storage.buckets order by 1`);
  console.log(`    ${buckets.length} bucket(s): ${buckets.map((b) => b.id + (b.public ? " (public)" : "")).join(", ")}`);
  if (!buckets.length) {
    say("no storage buckets were discovered at all — section 6 compared nothing");
  }

  for (const bucket of buckets) {
    const mimes = Array.isArray(bucket.allowed_mime_types) ? bucket.allowed_mime_types
      : String(bucket.allowed_mime_types ?? "").replace(/^{|}$/g, "").split(",").filter(Boolean);
    const mime = mimes[0] || "image/png";
    const aPath = `${A.id}/tenant-matrix.png`;
    const bPath = `${B.id}/tenant-matrix.png`;
    const forgedPath = `${B.id}/forged-by-owner-a.png`;

    const upA = await putObject(bucket.id, aPath, `${S("A")} bytes`, mime);
    const upB = await putObject(bucket.id, bPath, `${S("B")} bytes`, mime);
    storagePlanted.push([bucket.id, aPath], [bucket.id, bPath], [bucket.id, forgedPath]);

    // COUNT SUBJECTS, EXACTLY AS SECTION 3 DOES. `/object/list` answers
    // `200 []` for a denial and `200 []` for an empty folder, so a deny
    // assertion over a folder with nothing in it has compared nothing and
    // reads identically to a correct policy.
    const planted = await sql(`select name from storage.objects
                                where bucket_id = '${bucket.id}'
                                  and name in ('${aPath}', '${bPath}')`);
    const haveA = planted.some((r) => r.name === aPath);
    const haveB = planted.some((r) => r.name === bPath);
    if (!haveA || !haveB) {
      skips.push(`storage ${bucket.id}: could not plant ${!haveA ? "A" : ""}${!haveA && !haveB ? " and " : ""}`
        + `${!haveB ? "B" : ""}'s file (A ${upA.status} ${upA.text.slice(0, 80)} · B ${upB.status} ${upB.text.slice(0, 80)}) `
        + `— nothing was compared in this bucket`);
      rows.push({ table: `storage · ${bucket.id}`, verdict: "SKIPPED — no subject", detail: `A ${upA.status}, B ${upB.status}` });
      console.log(`    ${("storage · " + bucket.id).padEnd(34)} SKIPPED — could not plant a subject`);
      continue;
    }

    // ANON IS THE BASELINE, not a third tenant: anything anon can reach is
    // public by definition, so A reaching it is not a privilege A holds.
    const anonRead = await getObject(bucket.id, bPath, ANON);
    const anonListB = await listObjects(bucket.id, `${B.id}/`, ANON);
    const anonListA = await listObjects(bucket.id, `${A.id}/`, ANON);
    const anonSaw = anonRead.text.includes(S("B"));
    const anonListed = anonListB.list.length > 0;

    const problems = [];
    const flag = (det, msg) => problems.push({ det, msg });

    for (const actor of ACTORS) {
      if (actor.name === "anon") continue;             // anon IS the baseline

      // **THE BYTES, NOT THE STATUS CODE.** A 200 proves the request was
      // allowed; only B's sentinel in the body proves B's file came back.
      const rd = await getObject(bucket.id, bPath, actor.jwt);
      assertions++;
      if (BREAK !== "storage" && BREAK !== "storage-read" && rd.text.includes(S("B")) && !anonSaw) {
        flag("storage-read", `${actor.name} DOWNLOADED B's file from ${bucket.id} where anon got nothing`);
      }

      const ls = await listObjects(bucket.id, `${B.id}/`, actor.jwt);
      assertions++;
      if (BREAK !== "storage" && ls.list.length && !anonListed) {
        flag("storage-list", `${actor.name} LISTED ${ls.list.length} of B's object(s) in ${bucket.id} where anon listed none`);
      }

      // The removed member, against the folder they used to be inside. Storage
      // policies call `current_business_ids()` live, same as the tables, so
      // access must end with the membership row rather than with the token.
      if (actor.name === "former A") {
        const own = await listObjects(bucket.id, `${A.id}/`, actor.jwt);
        assertions++;
        if (BREAK !== "storage" && own.list.length && anonListA.list.length === 0) {
          flag("storage-former", `former A still lists ${own.list.length} object(s) of A's in `
            + `${bucket.id} after the membership was deleted`);
        }
      }
    }

    // THE HOLE THE BASELINE RULE LEAVES, and it is the same hole the RPC
    // canary fell through: "A gets no more than a stranger" says nothing about
    // a bucket that hands a tenant's files to the stranger too. Two buckets do
    // that on purpose and one of them is named, with its reason.
    // `--break=bucket-allowlist` empties the list and `business-media` reports,
    // which is the proof that the entry is refusable rather than decoration.
    assertions++;
    if (BREAK !== "storage" && anonSaw && !PUBLIC_BUCKETS_BY_DESIGN[bucket.id]) {
      flag("storage-public", `${bucket.id} hands B's own file to an ANONYMOUS caller, and it `
        + `is not one of the buckets that publish a tenant's images on purpose`);
    }

    // BOTH HALVES NON-ZERO. B must own a file for A to fail to read, and A
    // must own one that A can read, or the deny above proved only that the
    // bucket is broken for everybody.
    const ownRd = await getObject(bucket.id, aPath, ownerA.jwt);
    assertions++;
    if (!ownRd.text.includes(S("A"))) {
      flag("storage-subjects", `owner A cannot download its OWN file from ${bucket.id} `
        + `(${ownRd.status}) — every deny assertion in this bucket compared nothing`);
    }

    // WRITE INTO B'S FOLDER, and DELETE B's file. Checked at the database
    // rather than by the status code: storage answers 200 to a delete that
    // removed nothing, so the authority is whether the row is still there.
    const wr = await putObject(bucket.id, forgedPath, `${S("A")} forged`, mime, ownerA.jwt);
    assertions++;
    if (wr.status >= 200 && wr.status < 300) {
      flag("storage-write", `owner A UPLOADED a file into B's folder in ${bucket.id}`);
    }

    await delObject(bucket.id, bPath, ownerA.jwt);
    const still = await sql(`select count(*)::int as n from storage.objects
                              where bucket_id = '${bucket.id}' and name = '${bPath}'`);
    assertions++;
    if (Number(still[0]?.n ?? 0) === 0) {
      flag("storage-delete", `B's file in ${bucket.id} is GONE after owner A tried to delete it`);
    }

    if (bucket.id === CANARY_BUCKET) {
      canaryFindings.push(...problems.map((x) => `[${x.det}] ${x.msg}`));
      storageCanaryDetectors = [...new Set(problems.map((x) => x.det))];
      // CAUGHT BY [storage-read] SPECIFICALLY. A bucket-wide select policy
      // trips the list detector too, and "the canary was caught" would then be
      // true with the download comparison switched off — the identical trap
      // the table canary sprang in section 3. The detector that has to catch
      // it is the one that proves the BYTES crossed, because bytes crossing is
      // the whole reason this section exists.
      const byRead = problems.some((x) => x.det === "storage-read");
      rows.push({ table: `storage · ${bucket.id}`, verdict: byRead ? "caught (canary)" : "MISSED (canary)",
                  detail: problems.map((x) => x.msg).join("; ") });
      console.log(`    ${("storage · " + bucket.id).padEnd(34)} `
        + (byRead ? `canary caught by [storage-read]${storageCanaryDetectors.length > 1
            ? " (+ " + storageCanaryDetectors.filter((d) => d !== "storage-read").join(", ") + ")" : ""}`
          : "CANARY NOT CAUGHT BY THE STORAGE-READ DETECTOR"));
      if (!byRead) {
        console.log(`      owner A got ${ownRd.status} on its own file; on B's file: ${(await getObject(bucket.id, bPath, ownerA.jwt)).status}`);
        console.log(`      anon got ${anonRead.status}: ${anonRead.text.slice(0, 120)}`);
      }
      continue;
    }

    for (const x of problems) say(`storage ${bucket.id}: [${x.det}] ${x.msg}`);
    rows.push({ table: `storage · ${bucket.id}`, verdict: problems.length ? "LEAK" : "ok",
                detail: problems.map((x) => x.msg).join("; ") });
    console.log(`    ${("storage · " + bucket.id).padEnd(34)} `
      + (problems.length ? "LEAK — " + problems.map((x) => x.msg).join("; ")
                         : `ok${anonSaw ? "  (public by design — anon reads it too)" : ""}`));
  }

  // -------------------------------------------------------------------------
  // 7 · REALTIME — the socket
  // -------------------------------------------------------------------------
  // **REALTIME IS THREE MECHANISMS WEARING ONE NAME**, and they are guarded by
  // three different things. Asking "is Realtime isolated" as one question gets
  // one answer and covers at most a third of it:
  //
  //   a · postgres_changes — row changes streamed from the WAL. Governed by
  //       the `supabase_realtime` PUBLICATION (what streams at all) and then
  //       by each table's RLS (who receives it).
  //   b · the delivery itself — a subscriber of A actually receiving a row of
  //       B's. Governed by RLS, and provable only end to end over a socket.
  //   c · broadcast and presence — messages between clients that never touch a
  //       table. Governed by `realtime.messages` RLS **and only on channels
  //       opened as private**; a plain channel is authorised by nothing.
  //
  // (c) is the one nobody looks at, and it is the one with a hole in it.
  console.log("\n7 · realtime");

  // -- 7a · WHAT STREAMS AT ALL ---------------------------------------------
  const published = await sql(`
    select c.relname as t,
           exists (select 1 from pg_attribute a
                    where a.attrelid = c.oid and a.attname = 'business_id'
                      and a.attnum > 0 and not a.attisdropped) as has_biz
      from pg_publication p
      join pg_publication_rel pr on pr.prpubid = p.oid
      join pg_class c on c.oid = pr.prrelid
     where p.pubname = 'supabase_realtime'
     order by 1`);
  const streamedTenant = published.filter((r) => r.has_biz).map((r) => r.t);
  console.log(`    supabase_realtime publishes ${published.length} table(s); `
    + `${streamedTenant.length} carry a business_id`);

  // THE CANARY FOR THIS DETECTOR IS THE PUBLICATION ENTRY ITSELF. Without it
  // this reads "no tenant table streams" — which is TRUE today and would print
  // identically if the query were broken, misspelled or pointed at the wrong
  // publication. The canary table is published on purpose, so the detector has
  // to name it or it is not looking.
  const rtPubCaught = BREAK !== "realtime" && BREAK !== "realtime-pub" && streamedTenant.includes(CANARY);
  if (rtPubCaught) rtCanaryDetectors.push("realtime-publication");
  for (const t of streamedTenant.filter((t) => t !== CANARY)) {
    say(`realtime: [realtime-publication] ${t} carries a business_id and is published to `
      + `supabase_realtime — its row changes stream to subscribers, so its RLS is now `
      + `load-bearing over a socket as well as over the Data API`);
  }
  rows.push({ table: "realtime · publication",
              verdict: rtPubCaught ? "caught (canary)" : "MISSED (canary)",
              detail: `${published.length} published, ${streamedTenant.length} tenant-owned` });
  console.log(`    ${"realtime · publication".padEnd(34)} `
    + (rtPubCaught ? "canary caught by [realtime-publication]"
                   : "CANARY NOT CAUGHT — the canary table is published and this did not see it"));

  // -- the client ------------------------------------------------------------
  // **NOT HAND-ROLLED.** Realtime speaks Phoenix channels over a websocket and
  // `@supabase/supabase-js` — the library the app itself uses — already
  // implements it. Importing the app's own copy also means this section
  // exercises the same client a browser would.
  let createClient = null;
  try {
    ({ createClient } = await import(
      new URL("../app/node_modules/@supabase/supabase-js/dist/index.mjs", import.meta.url).href));
  } catch (e) {
    // NOT A SKIP. A missing client means the socket boundary was not measured,
    // and an unmeasured boundary must never print like a clean one.
    say(`realtime: @supabase/supabase-js could not be loaded from app/node_modules, so the `
      + `socket boundary was NOT measured at all (${String(e.message).slice(0, 90)}). `
      + `Run: npm install --prefix app`);
  }

  if (createClient) {
    const mkClient = (jwt) => {
      const c = createClient(URL_, ANON, { auth: { persistSession: false } });
      if (jwt) c.realtime.setAuth(jwt);
      rtClients.push(c);
      return c;
    };
    // `subscribe()` calls back more than once — SUBSCRIBED now, CLOSED at
    // teardown — so this resolves on the first and never on the last.
    const join = (ch) => new Promise((res) => {
      let done = false;
      const settle = (v) => { if (!done) { done = true; res(v); } };
      ch.subscribe((st, err) => settle({ st, err: err ? String(err).slice(0, 160) : null }));
      setTimeout(() => settle({ st: "TIMED_OUT", err: null }), 15000);
    });

    // -- 7b · DOES A ROW OF B'S REACH A SUBSCRIBER OF A? --------------------
    // **THE SOCKET IS PROVEN LIVE ON ITSELF BEFORE ITS SILENCE IS ALLOWED TO
    // MEAN ANYTHING.** This is `docs/gotchas.md` § "A function you just
    // created 404s through PostgREST" in a second costume: a subscription that
    // connected and received nothing, and a subscription that never connected
    // at all, produce the identical empty array. They are opposite findings —
    // one says the boundary holds, the other says the run proved nothing — and
    // they must never print the same way. So the same client first sends
    // itself a broadcast and must hear it back.
    const aClient = mkClient(ownerA.jwt);
    const beats = [];
    const beatCh = aClient.channel(`tenant-matrix-liveness-${Date.now()}`,
      { config: { broadcast: { self: true } } })
      .on("broadcast", { event: "beat" }, (p) => beats.push(p.payload));
    const beatJoin = await join(beatCh);
    if (beatJoin.st === "SUBSCRIBED") {
      await beatCh.send({ type: "broadcast", event: "beat", payload: { n: 1 } });
      for (let i = 0; i < 4 && !beats.length; i++) await wait(1500);
    }
    const socketLive = beats.length > 0;
    console.log(`    socket liveness: join ${beatJoin.st}, own broadcast heard back: ${socketLive}`);

    const streamed = [];
    const pgCh = aClient.channel(`tenant-matrix-pg-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: CANARY },
          (p) => streamed.push(p.new));
    const pgJoin = await join(pgCh);
    let pgVerdict;
    if (!socketLive) {
      say(`realtime: the socket never delivered a message this client sent to itself `
        + `(join ${beatJoin.st}${beatJoin.err ? ", " + beatJoin.err : ""}), so section 7b `
        + `measured nothing — an empty subscription here is a dead socket, not an isolated one`);
      pgVerdict = "UNMEASURED — dead socket";
    } else if (pgJoin.st !== "SUBSCRIBED") {
      say(`realtime: owner A could not subscribe to postgres_changes on the canary table `
        + `(${pgJoin.st}${pgJoin.err ? ", " + pgJoin.err : ""}) — the stream boundary was `
        + `never exercised`);
      pgVerdict = "UNMEASURED — no subscription";
    } else {
      // B's row, into a table published to realtime whose select policy is
      // `using (true)`. A subscriber of A must receive it, or nothing about
      // this boundary has been established.
      await svc.post(`/rest/v1/${CANARY}`, [{ business_id: B.id, note: `${S("B")} over the wire` }]);
      for (let i = 0; i < 6 && !streamed.length; i++) await wait(2500);
      assertions++;
      const sawB = BREAK !== "realtime"
        && streamed.some((r) => r && (r.business_id === B.id || JSON.stringify(r).includes(S("B"))));
      if (sawB) {
        rtCanaryDetectors.push("realtime-stream");
        pgVerdict = "caught (canary)";
      } else {
        // **A DECLARED, PROBED STATE — NOT A PASS AND NOT A SKIP.** The socket
        // is live (proved on itself, above), the subscription is registered,
        // the table is published with a policy that lets everybody read every
        // row, and the insert happened. Nothing arrived. That is postgres_changes
        // not delivering on this project — which is a fine posture, since
        // nothing tenant-owned is published and the app opens no channels — but
        // it means **this detector cannot tell isolation from silence**, and it
        // is recorded as uncertified rather than green.
        pgVerdict = "NOT DELIVERING — detector uncertified";
        skips.push(`realtime 7b: the canary table is published to supabase_realtime with a `
          + `"using (true)" select policy, owner A's subscription reported SUBSCRIBED, the `
          + `socket was proved live on itself, B's row was inserted — and nothing arrived in `
          + `15s. postgres_changes is not delivering on this project, so the [realtime-stream] `
          + `detector is NOT certified. It is uncovered rather than clean. The publication `
          + `carries no tenant table (7a) and the app opens no channels, so nothing is exposed `
          + `today; the day a table is published this detector must be re-proved first.`);
      }
    }
    rows.push({ table: "realtime · postgres_changes", verdict: pgVerdict,
                detail: `join ${pgJoin.st}, ${streamed.length} row(s) received` });
    console.log(`    ${"realtime · postgres_changes".padEnd(34)} ${pgVerdict}`);

    // -- 7c · WHO MAY JOIN A CHANNEL ----------------------------------------
    // A PRIVATE channel is authorised by `realtime.messages` RLS, which in
    // this project is forced on with zero policies — the same deliberate lock
    // `platform_admin_events` carries. Anon must be refused.
    const anonClient = mkClient(null);
    const privJoin = await join(anonClient.channel(`tenant-matrix-private-${Date.now()}`,
      { config: { private: true } }));
    assertions++;
    if (privJoin.st === "SUBSCRIBED") {
      say(`realtime: [realtime-broadcast] an ANONYMOUS client joined a PRIVATE channel — `
        + `realtime.messages has no policy keeping it out`);
    }
    console.log(`    private channel, anon: ${privJoin.st}${privJoin.err ? " — " + privJoin.err.slice(0, 70) : ""}`);

    // THE BROADCAST CANARY, AND IT IS NOT A SIMULATION. A channel opened
    // WITHOUT `private: true` is authorised by nothing whatsoever: the topic
    // string is the only thing standing between two tenants. Owner B sends on
    // it; a client holding the anon key and no session listens. If the
    // detector does not catch that, it cannot catch it in the product either.
    //
    // **AND IT IS A STANDING RISK, NOT ONLY A CONTROL.** The app opens zero
    // channels today. The first `supabase.channel('bookings-' + businessId)`
    // anybody writes is a cross-tenant channel on the day it ships, because a
    // topic name is a guess away. That warning is carried on every receipt.
    const canaryTopic = `tenant-matrix-canary-channel-${Date.now()}`;
    const heard = [];
    const eavesJoin = await join(mkClient(null).channel(canaryTopic)
      .on("broadcast", { event: "leak" }, (p) => heard.push(p.payload)));
    const senderCh = mkClient(ownerB.jwt).channel(canaryTopic);
    const sendJoin = await join(senderCh);
    if (eavesJoin.st === "SUBSCRIBED" && sendJoin.st === "SUBSCRIBED") {
      await senderCh.send({ type: "broadcast", event: "leak", payload: { note: `${S("B")} over the socket` } });
      for (let i = 0; i < 5 && !heard.length; i++) await wait(1500);
    } else {
      say(`realtime: the broadcast canary could not be set up (listener ${eavesJoin.st}, `
        + `sender ${sendJoin.st}) — it was never given the chance to leak, so this run `
        + `proves nothing about the channel boundary`);
    }
    assertions++;
    const bcCaught = BREAK !== "realtime" && heard.some((p) => JSON.stringify(p ?? null).includes(S("B")));
    if (bcCaught) {
      rtCanaryDetectors.push("realtime-broadcast");
      notes.push(`realtime 7c — STANDING RISK, nothing is wrong today: a channel opened without `
        + `{ config: { private: true } } is authorised by NOTHING. This run proved it by having a `
        + `client with the anon key and no session receive tenant B's message verbatim. The app `
        + `opens zero channels, so nothing is exposed; the first `
        + `supabase.channel('something-' + businessId) anybody writes is a cross-tenant channel on `
        + `the day it ships, because the topic name is the only thing separating two tenants and a `
        + `business id is a guess away. Private channels ARE closed — realtime.messages is RLS-on `
        + `with zero policies and anon was refused in the same run.`);
    }
    canaryFindings.push(bcCaught
      ? `[realtime-broadcast] an anonymous client with no session received tenant B's message on a non-private channel`
      : `[realtime-broadcast] NOT CAUGHT — ${heard.length} message(s) heard, none carrying B's sentinel`);
    rows.push({ table: "realtime · broadcast",
                verdict: bcCaught ? "caught (canary)" : "MISSED (canary)",
                detail: `anon heard ${heard.length} message(s) on a non-private channel` });
    console.log(`    ${"realtime · broadcast".padEnd(34)} `
      + (bcCaught ? "canary caught by [realtime-broadcast]"
                  : "CANARY NOT CAUGHT BY THE BROADCAST DETECTOR"));
  }

} finally {
  // SOCKETS FIRST — an open websocket keeps node alive and the run never ends.
  for (const c of rtClients) await c.removeAllChannels().catch(() => {});
  // Every object this run planted, in every bucket, whatever happened above.
  // `--keep` keeps the rows and the businesses; it does not keep litter in a
  // bucket the product actually serves from.
  for (const [bucket, path] of storagePlanted) {
    await delObject(bucket, path, SERVICE).catch(() => {});
  }
  await dropStorageCanary().catch((e) => say("could not drop the canary bucket: " + e.message));
  await dropCanary().catch((e) => say("could not drop the canary table: " + e.message));
  await dropRpcCanary().catch((e) => say("could not drop the canary RPC: " + e.message));
  if (!KEEP && A && B) await svc.del("/rest/v1/businesses?slug=in.(matrix-tenant-a,matrix-tenant-b)");
}

// ---------------------------------------------------------------------------

const canary = {
  id: `four negative controls · a table with "using (true)" on select, a definer RPC that `
    + `trusts a tenant id from its caller, a bucket whose policy scopes to the bucket and `
    + `nothing else, and a realtime channel authorised by nothing`,
  // CAUGHT BY THE RIGHT DETECTOR, not merely caught.
  // FOUR NEGATIVE CONTROLS, EACH BY ITS OWN DETECTOR. A leaky table must be
  // caught by `leak`; a leaky `security definer` RPC by `rpc`; a leaky bucket
  // by `storage-read`; a published table by `realtime-publication` and an
  // unauthorised channel by `realtime-broadcast`. Any one coming back clean
  // voids the whole run. They prove different boundaries and none can stand in
  // for another — the table matrix is structurally incapable of seeing an RPC
  // leak, because a definer function bypasses the policies it checks, and it
  // is equally incapable of seeing a file, because the bytes are not in a row.
  //
  // `realtime-stream` is NOT in this list, and that is the honest reading
  // rather than a convenience: postgres_changes does not deliver on this
  // project, so its canary cannot fire, so that detector is uncertified and
  // section 7b says so in `warnings` instead of printing green.
  observed_failure: canaryDetectors.includes("leak")
    && rpcCanaryDetectors.includes("rpc")
    && storageCanaryDetectors.includes("storage-read")
    && rtCanaryDetectors.includes("realtime-publication")
    && rtCanaryDetectors.includes("realtime-broadcast"),
  caught_by: canaryDetectors,
  rpc_caught_by: rpcCanaryDetectors,
  storage_caught_by: storageCanaryDetectors,
  realtime_caught_by: rtCanaryDetectors,
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

const status = failures.length === 0 && canary.observed_failure ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: "tenant-matrix",
  started_at,
  status,
  // Four numbers from four places, so they can disagree.
  expected_targets: DECLARED_BIZ.size, // from supabase/migrations/, before the run
  discovered_targets: bizDiscovered,   // business_id tables found in `public`
  attempted_targets: bizAttempted,     // of those, the ones this run examined
  completed_targets: bizCompleted,     // of those, the ones that reached a verdict
  // **THIS SAID `0` WHILE `skips` WAS FULL — 2026-09-20, ROADMAP 14.11.** The
  // line forty rows above prints `${skips.length} skip(s)` into the report,
  // every skip carries a written reason, and they are all filed in
  // `warnings` — and the number handed to the grader was a literal zero. So
  // `receipt.mjs`'s rule that **skips are failures unless allowlisted with an
  // expiry** could never fire here, for a check that skips seeds it could not
  // plant, tables where B owns no row, RPCs whose arguments cannot be
  // synthesised, buckets it could not write to, and a realtime publication.
  // The reasons existed the whole time; only the accounting lied.
  //
  // It is reported honestly now, which means this receipt FAILS until someone
  // either allowlists these with an expiry they are willing to put a date on,
  // or removes the skips. That is the intended outcome: an honest failure is
  // worth more than a sanctioned silence, and a skip nobody has to re-justify
  // on a date is a skip that becomes permanent by not being looked at.
  skipped_targets: skips.length,
  assertions_executed: assertions,
  // **RAISED FROM 300 TO 700 WHEN SECTIONS 6 AND 7 LANDED, AND A FLOOR NOBODY
  // RAISES IS A FLOOR THAT STOPS WORKING.** 300 was slack enough that storage
  // and realtime could be deleted from this file entirely and the receipt
  // would still pass its own assertion rule — the tables and RPCs alone ran
  // 693. The floor now sits just above that number, so losing a whole boundary
  // fails the run rather than shrinking it quietly. Normal schema churn moves
  // this by a handful either way; a section going missing moves it by thirty.
  min_assertions: 700,
  failures,
  artifacts: [art],
  warnings: [...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []), ...notes, ...skips],
  dimensions: {
    project: REF,
    actors: ["anon", "owner A", "staff A", "former A"],
    boundaries: ["data-api-tables", "definer-rpcs", "storage-objects", "realtime"],
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
