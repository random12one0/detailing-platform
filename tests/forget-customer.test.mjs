// ROADMAP 8.11 — a customer asks to be forgotten, and the whole design is one
// sentence: FORGET THE PERSON, KEEP THE MONEY.
//
// **THE CHECK THAT MATTERS MOST IS THE ONE ABOUT WHAT DID NOT CHANGE.** The
// two obvious builds are wrong in opposite directions: deleting the bookings
// destroys the detailer's own takings (and `money-export`'s tie-out with
// them), while deleting only the `customers` row forgets nothing — `bookings`
// carries the name, the number, the address and the notes DENORMALISED on
// every row. So § 2 asserts the money is identical to the cent and § 3
// asserts the person is not anywhere in the database. Either one alone passes
// for a broken build.
//
// It runs against the DEPLOYED function on a throwaway business it creates and
// removes, because the two things that can go wrong here — the permission gate
// and the storage deletion — are not visible from any source read.
//
//   node tests/forget-customer.test.mjs

import "./_env.mjs";           // root .env -> process.env, before anything reads it

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
let ANON = process.env.SUPABASE_ANON_KEY;

if (!URL_ || !SERVICE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!ANON) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/api-keys?reveal=true`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}` } },
  );
  const keys = await res.json();
  ANON = keys.find((k) => k.name === "anon")?.api_key ?? keys.find((k) => k.type === "publishable")?.api_key;
}

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};

async function rest(method, path, { key = SERVICE, jwt, body } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const svc = {
  get: (p) => rest("GET", p),
  post: (p, b) => rest("POST", p, { body: b }),
  del: (p) => rest("DELETE", p),
};
async function fn(name, body, jwt) {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON, ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
async function ensureUser(email, password) {
  await rest("POST", "/auth/v1/admin/users", { body: { email, password, email_confirm: true } });
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const s = await r.json();
  if (!s.access_token) throw new Error(`sign-in failed for ${email}: ${JSON.stringify(s)}`);
  return { id: s.user.id, jwt: s.access_token };
}

// ─── setup ────────────────────────────────────────────────────────────────
console.log("setup: two businesses, an owner, a staff member, and a customer with history");

const PW = "Phase8-forget-test-pw!";
const owner = await ensureUser("forget-owner@forget.test", PW);
const staff = await ensureUser("forget-staff@forget.test", PW);

for (const slug of ["forget-a", "forget-b"]) await svc.del(`/rest/v1/businesses?slug=eq.${slug}`);
const [A, B] = (await svc.post("/rest/v1/businesses", [
  { slug: "forget-a", name: "Forget A", timezone: "America/Los_Angeles", status: "active" },
  { slug: "forget-b", name: "Forget B", timezone: "America/Los_Angeles", status: "active" },
])).data;
// EVERY OBJECT NEEDS THE SAME KEYS. PostgREST answers a bulk insert whose
// rows have different key sets with `PGRST102: All object keys must match`,
// and the row that got dropped here was the one the whole § 1 depends on —
// which presented as the OWNER being refused, i.e. as a broken permission
// gate rather than as a broken fixture.
const memberships = await svc.post("/rest/v1/business_users", [
  { business_id: A.id, user_id: owner.id, role: "owner", permissions: [] },
  // Every tick there is, so § 1 cannot pass by the staff member simply
  // lacking a permission that happens to gate this.
  { business_id: A.id, user_id: staff.id, role: "staff",
    permissions: ["money", "marketing", "settings", "requests"] },
  { business_id: B.id, user_id: owner.id, role: "owner", permissions: [] },
]);

if (memberships.status >= 300 || (memberships.data ?? []).length !== 3) {
  console.error("SETUP FAILED — memberships:", memberships.status, JSON.stringify(memberships.data));
  process.exit(1);
}

const dana = (await svc.post("/rest/v1/customers", [{
  business_id: A.id, name: "Dana Ortiz", email: "dana@forget.test",
  phone: "5550001111", address: "18 Maple Row", notes: "Gate code 4471, dog in the yard",
}])).data[0];
// A second customer whose record must be untouched — a delete that took the
// whole table would pass every check that only looks at Dana.
const other = (await svc.post("/rest/v1/customers", [{
  business_id: A.id, name: "Priya Anand", email: "priya@forget.test", phone: "5550002222",
}])).data[0];
// And a customer of the OTHER business, for the cross-tenant check.
const bCustomer = (await svc.post("/rest/v1/customers", [{
  business_id: B.id, name: "Someone Else", phone: "5550003333",
}])).data[0];

const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString();
const JOBS = [
  { at: day(-30), total: 240, final: 260 },
  { at: day(-10), total: 95, final: null },
  { at: day(7), total: 180, final: null },
];
const bookings = (await svc.post("/rest/v1/bookings", JOBS.map((j, i) => ({
  business_id: A.id, customer_id: dana.id,
  customer_name: dana.name, customer_phone: dana.phone,
  customer_email: dana.email, customer_address: dana.address,
  customer_notes: "Please park on the street",
  admin_notes: "Dana's gate code is 4471",
  start_at: j.at, end_at: new Date(new Date(j.at).getTime() + 3_600_000).toISOString(),
  service_type: "mobile", vehicle_size: "small", vehicle_model: "Honda Civic",
  subtotal: j.total, total_price: j.total, final_amount: j.final,
  status: i === 2 ? "confirmed" : "completed",
  payment_status: j.final ? "paid" : "pending",
})))).data;
const otherBooking = (await svc.post("/rest/v1/bookings", [{
  business_id: A.id, customer_id: other.id,
  customer_name: other.name, customer_phone: other.phone,
  start_at: day(-3), end_at: new Date(Date.now() - 3 * 86_400_000 + 3_600_000).toISOString(),
  service_type: "dropoff", vehicle_size: "small",
  subtotal: 65, total_price: 65, status: "completed", payment_status: "paid",
}])).data[0];

// A photo ROW AND A REAL FILE, because the row is not the photo — and the
// whole of § 3h is about the half SQL cannot reach.
//
// **IT HAS TO BE A REAL IMAGE MIME TYPE.** The bucket is created with an
// `allowed_mime_types` list, so `text/plain` is refused with a 415 — and on
// this file's first run that made the upload fail silently, which made "the
// file is gone" trivially true. The `setup ·` check below is what caught it;
// without it a green 3h would have been reporting a deletion of nothing.
const photoPath = `${A.id}/${bookings[0].id}/forget-test.png`;
// The smallest valid PNG there is: 1x1, transparent.
const PNG = Uint8Array.from(atob(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
  + "YPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
), (c) => c.charCodeAt(0));
await fetch(`${URL_}/storage/v1/object/job-photos/${photoPath}`, {
  method: "POST",
  headers: {
    apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
    "Content-Type": "image/png", "x-upsert": "true",
  },
  body: PNG,
});
await svc.post("/rest/v1/job_photos", [{
  business_id: A.id, booking_id: bookings[0].id, kind: "before",
  path: photoPath, bytes: PNG.length, caption: "Dana's car before",
}]);

// **ASK THE BUCKET WHAT IT HOLDS — NEVER GET THE OBJECT.** An authenticated
// GET on a deleted object still answers 200 from cache: measured here, on a
// path that `storage.objects` confirmed was gone. A check written the obvious
// way therefore reports the file is STILL THERE after a correct deletion,
// which is what it did on this file's second run and sent this session looking
// for a bug in the edge function that did not exist. `list` is authoritative.
const fileExists = async (p) => {
  const dir = p.slice(0, p.lastIndexOf("/"));
  const name = p.slice(p.lastIndexOf("/") + 1);
  const r = await fetch(`${URL_}/storage/v1/object/list/job-photos`, {
    method: "POST",
    headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefix: dir, limit: 100 }),
  });
  if (!r.ok) return false;
  const rows = await r.json().catch(() => []);
  return (rows ?? []).some((o) => o.name === name);
};
const moneyOf = async () => {
  const r = await svc.get(
    `/rest/v1/bookings?business_id=eq.${A.id}&select=id,total_price,final_amount,subtotal,status,payment_status&order=start_at`,
  );
  return (r.data ?? []).map((b) => [b.id, Number(b.subtotal), Number(b.total_price),
    b.final_amount === null ? null : Number(b.final_amount), b.status, b.payment_status]);
};

const before = await moneyOf();
check("setup · the file really is in the bucket", await fileExists(photoPath));
check("setup · and the customer has three jobs", before.length === 4, `${before.length} rows`);

// ─── 1. Who may do it ─────────────────────────────────────────────────────
// OWNER ONLY, and the staff member above holds EVERY permission tick — so a
// pass here cannot be an accident of which tick happens to gate it.
console.log("\n1. who may do it");
{
  const anon = await fn("delete-customer", { business_id: A.id, customer_id: dana.id });
  check("1a · no session is refused", anon.status === 401 || anon.status === 404, `${anon.status}`);

  const asStaff = await fn("delete-customer", { business_id: A.id, customer_id: dana.id }, staff.jwt);
  check("1b · a staff member with every permission tick is still refused",
    asStaff.status === 403, `${asStaff.status} ${JSON.stringify(asStaff.data)}`);

  // A 404 rather than a 403: there is nothing to learn by guessing ids.
  const crossTenant = await fn("delete-customer",
    { business_id: B.id, customer_id: dana.id }, owner.jwt);
  check("1c · a customer id from another business is not found",
    crossTenant.status === 404, `${crossTenant.status}`);

  const stillThere = await svc.get(`/rest/v1/customers?id=eq.${dana.id}&select=id`);
  check("1d · and none of that deleted anything", (stillThere.data ?? []).length === 1);
}

// ─── 2. The money does not move ───────────────────────────────────────────
console.log("\n2. the money does not move");
const result = await fn("delete-customer", { business_id: A.id, customer_id: dana.id }, owner.jwt);
check("2a · the owner's request succeeds", result.status === 200, JSON.stringify(result.data));
check("2b · and it reports what it did",
  result.data?.bookings_anonymised === 3 && result.data?.photos_deleted === 1,
  JSON.stringify(result.data));
{
  const after = await moneyOf();
  check("2c · every booking row still exists", after.length === before.length,
    `${before.length} → ${after.length}`);
  check("2d · and every money column is identical, to the cent",
    JSON.stringify(after) === JSON.stringify(before),
    `${JSON.stringify(before)}\n        ${JSON.stringify(after)}`);
}

// ─── 3. The person is gone ────────────────────────────────────────────────
console.log("\n3. the person is gone");
{
  const gone = await svc.get(`/rest/v1/customers?id=eq.${dana.id}&select=id`);
  check("3a · the customer record is deleted", (gone.data ?? []).length === 0);

  const rows = await svc.get(
    `/rest/v1/bookings?business_id=eq.${A.id}&customer_name=eq.Deleted customer`
    + "&select=customer_id,customer_name,customer_phone,customer_email,customer_address,customer_notes,admin_notes,vehicle_model",
  );
  const anon = rows.data ?? [];
  check("3b · all three jobs are anonymised", anon.length === 3, `${anon.length}`);
  // **`[].every()` IS TRUE, so each of these ASSERTS ITS SUBJECTS FIRST.** On
  // this file's first run the deletion failed, `anon` came back empty, and all
  // three of these reported ok — three green checks about a deletion that had
  // not happened. That is this repo's most repeated failure arriving in a
  // brand-new suite written by somebody who had just read about it.
  const all = (f) => anon.length === 3 && anon.every(f);
  check("3c · nothing on them points back at the customer",
    all((b) => b.customer_id === null && b.customer_email === null
      && b.customer_address === null && b.customer_notes === null && b.customer_phone === ""));
  // The single most likely place in this schema for "gate code 4471".
  check("3d · including the detailer's own note about the job",
    all((b) => b.admin_notes === null));
  // Detached from a name, a number and an address, a car model is not a
  // person — and it is what the JOB was.
  check("3e · but the car survives, because that is what the job WAS",
    all((b) => b.vehicle_model === "Honda Civic"));

  // THE SEARCH NOBODY WOULD THINK TO RUN: her details anywhere in the table.
  const byPhone = await svc.get(`/rest/v1/bookings?business_id=eq.${A.id}&customer_phone=eq.5550001111&select=id`);
  const byEmail = await svc.get(`/rest/v1/bookings?business_id=eq.${A.id}&customer_email=eq.dana@forget.test&select=id`);
  const byName = await svc.get(`/rest/v1/bookings?business_id=eq.${A.id}&customer_name=eq.Dana Ortiz&select=id`);
  check("3f · and she cannot be found by phone, email or name anywhere in bookings",
    (byPhone.data ?? []).length === 0 && (byEmail.data ?? []).length === 0
      && (byName.data ?? []).length === 0);

  const photoRows = await svc.get(`/rest/v1/job_photos?business_id=eq.${A.id}&select=id`);
  check("3g · the photo ROW is gone", (photoRows.data ?? []).length === 0);
  // A row is not a photo. This is the half SQL cannot do and the half that
  // fails silently — the deletion reports success either way.
  check("3h · and so is the FILE, which is the half SQL cannot reach",
    result.data?.photos_deleted === 1 && !(await fileExists(photoPath)),
    `reported ${result.data?.photos_deleted}`);
}

// ─── 4. Nobody else is touched ────────────────────────────────────────────
// A delete that took the whole table passes every check above.
console.log("\n4. nobody else is touched");
{
  const others = await svc.get(`/rest/v1/customers?business_id=eq.${A.id}&select=id,name,phone`);
  check("4a · the other customer of the same business is untouched",
    (others.data ?? []).length === 1 && others.data[0].name === "Priya Anand",
    JSON.stringify(others.data));
  const theirBooking = await svc.get(`/rest/v1/bookings?id=eq.${otherBooking.id}&select=customer_id,customer_name`);
  check("4b · and so is their booking",
    theirBooking.data?.[0]?.customer_id === other.id
      && theirBooking.data?.[0]?.customer_name === "Priya Anand");
  const bStill = await svc.get(`/rest/v1/customers?id=eq.${bCustomer.id}&select=id`);
  check("4c · and the other business's customer is untouched", (bStill.data ?? []).length === 1);
}

// ─── 5. The function is not reachable from a browser ─────────────────────
// `forget_customer` runs as the service role with no RLS above it, so the
// only thing standing between a signed-in staff member and it is the grant.
console.log("\n5. the SQL function is not reachable from a browser");
{
  const asStaff = await rest("POST", "/rest/v1/rpc/forget_customer", {
    key: ANON, jwt: staff.jwt,
    body: { p_business_id: A.id, p_customer_id: other.id },
  });
  check("5a · a staff session cannot call forget_customer directly",
    asStaff.status === 404 || asStaff.status === 403, `${asStaff.status}`);
  const asOwner = await rest("POST", "/rest/v1/rpc/forget_customer", {
    key: ANON, jwt: owner.jwt,
    body: { p_business_id: A.id, p_customer_id: other.id },
  });
  check("5b · and neither can the OWNER — the edge function is the only door",
    asOwner.status === 404 || asOwner.status === 403, `${asOwner.status}`);
  const stillThere = await svc.get(`/rest/v1/customers?id=eq.${other.id}&select=id`);
  check("5c · so the other customer is still there", (stillThere.data ?? []).length === 1);
}

// ─── 6. What only reading the source can see ─────────────────────────────
console.log("\n6. what only reading the source can see");
{
  const { readFileSync } = await import("node:fs");
  const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
  const strip = (t) => t
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/^\s*--.*$/gm, "");
  const edge = strip(read("supabase/functions/delete-customer/index.ts"));
  const sql = strip(read("supabase/migrations/20260907001000_forget_customer.sql"));

  // THE ORDER IS THE ONLY THING HERE THAT CAN GO WRONG QUIETLY. Rows first
  // loses the paths — the rows that name them are gone — and the files are
  // then unreachable and undeletable for ever.
  const removeAt = edge.indexOf('storage.from("job-photos").remove');
  const rpcAt = edge.indexOf('rpc("forget_customer"');
  check("6a · the FILES are removed before the rows that name them",
    removeAt > 0 && rpcAt > 0 && removeAt < rpcAt, `${removeAt} / ${rpcAt}`);

  // A failed file removal must ABORT. Carrying on leaves a stranger's car in
  // a bucket with nothing left pointing at it, and reports success.
  check("6b · and a failed removal stops everything rather than carrying on",
    /if \(rmErr\)[\s\S]{0,400}return json\(/.test(edge));

  // Writing "deleted dana@example.com" to a log keeps the address after being
  // asked to destroy it, in the one place nobody would look.
  check("6c · nothing about the person reaches a log",
    !/console\.(log|warn|error)\([^)]*(customer_email|customer_name|\bemail\b|\bphone\b)/.test(edge));

  check("6d · the money columns are not in the anonymising UPDATE",
    !/update public\.bookings[\s\S]*?where/i.exec(sql)?.[0]
      .match(/total_price|subtotal|final_amount|payment_status/));
  check("6e · and the SQL function is revoked from anon and authenticated",
    /revoke all on function public\.forget_customer\(uuid, uuid\) from public, anon, authenticated/.test(sql));
  // **REWRITTEN AFTER BASELINING MISSED IT.** The first version matched
  // `where id = p_customer_id and business_id = p_business_id` anywhere in the
  // file — and that exact phrase appears TWICE, on the lookup and on the
  // delete. Removing the business filter from the DELETE left the lookup's
  // copy matching, so the check stayed green while the function would erase a
  // customer of another tenant. It asks the real question now: **every
  // statement that names the customer must also name the business.**
  {
    const body = sql.slice(sql.indexOf("begin"), sql.lastIndexOf("end;"));
    const statements = body.split(";").filter((st) => /p_customer_id/.test(st));
    const unscoped = statements.filter((st) => !/p_business_id/.test(st));
    check("6f · every statement naming the customer also names the business",
      statements.length >= 4 && unscoped.length === 0,
      `${statements.length} statements, ${unscoped.length} unscoped: ${unscoped.join(" | ").slice(0, 160)}`);
  }

  // OWNER ONLY, and it is the SERVER that says so — the screen hiding the
  // button is courtesy.
  check("6g · the endpoint refuses anybody who is not the owner",
    /member\.role !== "owner"/.test(edge));
  const screen = strip(read("app/src/screens/Clients.jsx"));
  check("6h · and the screen hides it from them too",
    /role === "owner" &&/.test(screen));
  check("6i · the confirm says the jobs SURVIVE, not just that the person goes",
    /anonymous entries/.test(screen) && /cannot be undone/.test(screen));
}

// ─── teardown ─────────────────────────────────────────────────────────────
for (const slug of ["forget-a", "forget-b"]) await svc.del(`/rest/v1/businesses?slug=eq.${slug}`);
await fetch(`${URL_}/storage/v1/object/job-photos`, {
  method: "DELETE",
  headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" },
  body: JSON.stringify({ prefixes: [photoPath] }),
}).catch(() => {});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
