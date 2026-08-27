// Phase 1 tenant-isolation test suite. Run after every schema change:
//
//   node tests/tenant-isolation.test.mjs
//
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and either
// SUPABASE_ANON_KEY or (SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF, from
// which the anon key is fetched via the Management API).
//
// The 12 tests, per the Phase 1 brief:
//  1. Two businesses can both have promo code SUMMER10.
//  2. Two businesses can both have campaign slug "golf".
//  3. Two businesses can have completely different weekly hours.
//  4. Two businesses can set special hours on the same calendar date.
//  5. As Business A, queries against bookings/customers/expenses/promo
//     codes/settings return zero Business B rows.
//  6. A cannot update or delete a B row, even by passing B's UUID directly.
//  7. Passing another business's business_id in a request body changes
//     nothing — tenancy comes from the session, never the payload.
//  8. An anonymous visitor cannot enumerate B's services, prices, or hours.
//  9. Two simultaneous bookings for the same slot: exactly one succeeds.
// 10. A booking ending exactly when another begins is rejected.
// 11. Changing A's buffer from 60 to 0 does not affect B's availability.
// 12. Two businesses in different timezones each calculate correctly,
//     including across a daylight-saving boundary.

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
  if (!res.ok) {
    console.error("Could not fetch anon key from Management API:", res.status);
    process.exit(1);
  }
  const keys = await res.json();
  ANON =
    keys.find((k) => k.name === "anon")?.api_key ??
    keys.find((k) => k.type === "publishable")?.api_key;
  if (!ANON) {
    console.error("No anon/publishable key found for project");
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

async function rest(method, pathname, { key = SERVICE, jwt, body, headers = {} } = {}) {
  const res = await fetch(`${URL_}${pathname}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

const svc = {
  get: (p) => rest("GET", p),
  post: (p, body) => rest("POST", p, { body }),
  del: (p) => rest("DELETE", p),
};

async function ensureUser(email, password) {
  const create = await rest("POST", "/auth/v1/admin/users", {
    body: { email, password, email_confirm: true },
  });
  if (create.status !== 200 && create.status !== 201 && create.status !== 422) {
    throw new Error(`admin create user ${email}: ${create.status} ${JSON.stringify(create.data)}`);
  }
  const signin = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await signin.json();
  if (!session.access_token) {
    throw new Error(`sign-in failed for ${email}: ${JSON.stringify(session)}`);
  }
  return { id: session.user.id, jwt: session.access_token };
}

let passed = 0;
let failed = 0;
function check(name, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failed++;
    console.error(`  FAIL  ${name} ${detail}`);
  }
}

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------

console.log("setup: users + two businesses (A: Los Angeles, B: New York)");

const PASSWORD = "Phase1-isolation-test-pw!";
const userA = await ensureUser("phase1-owner-a@isolation.test", PASSWORD);
const userB = await ensureUser("phase1-owner-b@isolation.test", PASSWORD);

// Clean out any prior run (cascades wipe every child table).
await svc.del("/rest/v1/businesses?slug=in.(phase1-a,phase1-b)");

const bizRes = await svc.post("/rest/v1/businesses", [
  { slug: "phase1-a", name: "Phase1 Detailing A", timezone: "America/Los_Angeles" },
  { slug: "phase1-b", name: "Phase1 Detailing B", timezone: "America/New_York" },
]);
if (bizRes.status !== 201) {
  console.error("business setup failed:", bizRes.status, JSON.stringify(bizRes.data));
  process.exit(1);
}
const A = bizRes.data.find((b) => b.slug === "phase1-a");
const B = bizRes.data.find((b) => b.slug === "phase1-b");

await svc.post("/rest/v1/business_users", [
  { business_id: A.id, user_id: userA.id, role: "owner" },
  { business_id: B.id, user_id: userB.id, role: "owner" },
]);
await svc.post("/rest/v1/business_settings", [
  { business_id: A.id },
  { business_id: B.id },
]);
await svc.post("/rest/v1/business_branding", [
  { business_id: A.id, primary_color: "#0a2f52" },
  { business_id: B.id, primary_color: "#7a1f1f" },
]);

// Different weekly hours (test 3) + same-date overrides (test 4)
await svc.post("/rest/v1/business_hours", [
  { business_id: A.id, weekday: 1, open_time: "09:00", close_time: "17:00" },
  { business_id: B.id, weekday: 1, open_time: "10:00", close_time: "18:00" },
]);
await svc.post("/rest/v1/booking_hours_overrides", [
  { business_id: A.id, date: "2026-09-15", open_time: "08:00", close_time: "12:00" },
  { business_id: B.id, date: "2026-09-15", open_time: "12:00", close_time: "20:00" },
]);

// Same promo code / campaign slug for both (tests 1-2)
const promoRes = await svc.post("/rest/v1/promo_codes", [
  { business_id: A.id, code: "SUMMER10", type: "percentage", value: 10 },
  { business_id: B.id, code: "SUMMER10", type: "percentage", value: 20 },
]);
const promoB = promoRes.data?.find?.((p) => p.business_id === B.id);
await svc.post("/rest/v1/campaigns", [
  { business_id: A.id, slug: "golf", name: "Golf course QR A" },
  { business_id: B.id, slug: "golf", name: "Golf course QR B" },
]);

// Catalog + private data for B that A must never see
await svc.post("/rest/v1/services", [
  { business_id: A.id, name: "Full Detail A", price: 150, duration_minutes: 120 },
  { business_id: B.id, name: "Secret B Special", price: 999, duration_minutes: 60 },
]);
await svc.post("/rest/v1/expenses", [
  { business_id: B.id, date: "2026-08-01", category: "supplies", description: "B towels", amount: 42, payment_method: "cash" },
]);
const custRes = await svc.post("/rest/v1/customers", [
  { business_id: B.id, name: "B Customer", phone: "555-0100" },
]);
const bookingBRes = await svc.post("/rest/v1/bookings", [
  {
    business_id: B.id,
    customer_id: custRes.data?.[0]?.id,
    customer_name: "B Customer",
    customer_phone: "555-0100",
    start_at: "2026-09-20T14:00:00Z",
    end_at: "2026-09-20T16:00:00Z",
    service_type: "mobile",
  },
]);
const bookingB = bookingBRes.data?.[0];
if (!bookingB) {
  console.error("B booking fixture failed:", bookingBRes.status, JSON.stringify(bookingBRes.data));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1-4: shared identifiers no longer collide
// ---------------------------------------------------------------------------

console.log("test 1: both businesses can own promo code SUMMER10");
{
  const r = await svc.get(
    `/rest/v1/promo_codes?code=eq.SUMMER10&business_id=in.(${A.id},${B.id})&select=business_id,value`,
  );
  check("two SUMMER10 rows exist", r.data?.length === 2, JSON.stringify(r.data));
  check(
    "they belong to different businesses",
    new Set(r.data?.map((p) => p.business_id)).size === 2,
  );
}

console.log("test 2: both businesses can own campaign slug golf");
{
  const r = await svc.get(`/rest/v1/campaigns?slug=eq.golf&business_id=in.(${A.id},${B.id})&select=business_id`);
  check("two golf campaigns exist", r.data?.length === 2, JSON.stringify(r.data));
}

console.log("test 3: different weekly hours per business");
{
  const r = await svc.get(`/rest/v1/business_hours?weekday=eq.1&business_id=in.(${A.id},${B.id})&select=business_id,open_time`);
  const a = r.data?.find((h) => h.business_id === A.id);
  const b = r.data?.find((h) => h.business_id === B.id);
  check("both have Monday rows", !!a && !!b);
  check("Monday hours differ", a?.open_time !== b?.open_time, `${a?.open_time} vs ${b?.open_time}`);
}

console.log("test 4: special hours on the same calendar date");
{
  const r = await svc.get(`/rest/v1/booking_hours_overrides?date=eq.2026-09-15&business_id=in.(${A.id},${B.id})&select=business_id`);
  check("both overrides for 2026-09-15 exist", r.data?.length === 2, JSON.stringify(r.data));
}

// ---------------------------------------------------------------------------
// 5-7: authenticated cross-tenant isolation
// ---------------------------------------------------------------------------

console.log("test 5: authenticated as A, zero B rows anywhere");
for (const table of ["bookings", "customers", "expenses", "promo_codes", "business_settings"]) {
  const r = await rest("GET", `/rest/v1/${table}?select=business_id`, { key: ANON, jwt: userA.jwt });
  const leaked = (r.data ?? []).filter((row) => row.business_id !== A.id);
  check(`${table}: only A rows`, r.status === 200 && leaked.length === 0, JSON.stringify(r.data));
}

console.log("test 6: A cannot update or delete B rows by UUID");
{
  const upd = await rest("PATCH", `/rest/v1/promo_codes?id=eq.${promoB.id}`, {
    key: ANON, jwt: userA.jwt, body: { value: 99 },
  });
  check("update matched zero rows", upd.status === 200 && upd.data?.length === 0, JSON.stringify(upd.data));
  const del = await rest("DELETE", `/rest/v1/bookings?id=eq.${bookingB.id}`, {
    key: ANON, jwt: userA.jwt,
  });
  check("delete matched zero rows", del.status === 200 && del.data?.length === 0, JSON.stringify(del.data));
  const still = await svc.get(`/rest/v1/promo_codes?id=eq.${promoB.id}&select=value`);
  check("B promo value unchanged", still.data?.[0]?.value === 20, JSON.stringify(still.data));
  const stillB = await svc.get(`/rest/v1/bookings?id=eq.${bookingB.id}&select=id`);
  check("B booking still exists", stillB.data?.length === 1);
}

console.log("test 7: forged business_id in payload is rejected");
{
  const r = await rest("POST", "/rest/v1/promo_codes", {
    key: ANON, jwt: userA.jwt,
    body: { business_id: B.id, code: "FORGED", type: "amount", value: 5 },
  });
  check("insert into B as A → 403", r.status === 403, `${r.status} ${JSON.stringify(r.data)}`);
  const r2 = await rest("POST", "/rest/v1/bookings", {
    key: ANON, jwt: userA.jwt,
    body: {
      business_id: B.id, customer_name: "x", customer_phone: "x",
      start_at: "2026-10-01T17:00:00Z", end_at: "2026-10-01T18:00:00Z", service_type: "mobile",
    },
  });
  check("booking into B as A → 403", r2.status === 403, `${r2.status}`);
  const none = await svc.get("/rest/v1/promo_codes?code=eq.FORGED&select=id");
  check("nothing was written", none.data?.length === 0);
}

// ---------------------------------------------------------------------------
// 8: anonymous access
// ---------------------------------------------------------------------------

console.log("test 8: anonymous visitors cannot enumerate tenant data");
for (const table of ["services", "business_hours", "business_branding", "promo_codes", "bookings"]) {
  const r = await rest("GET", `/rest/v1/${table}?select=*`, { key: ANON, jwt: ANON });
  const empty = r.status === 200 ? (r.data ?? []).length === 0 : r.status === 401 || r.status === 403;
  check(`${table}: no anon access`, empty, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
}
{
  const a = await rest("POST", "/rest/v1/rpc/get_public_business_profile", {
    key: ANON, jwt: ANON, body: { p_slug: "phase1-a" },
  });
  check("public profile for A resolves by slug", a.data?.business?.slug === "phase1-a");
  const names = JSON.stringify(a.data?.services ?? []);
  check("A profile contains no B services", !names.includes("Secret B Special"), names);
  const unknown = await rest("POST", "/rest/v1/rpc/get_public_business_profile", {
    key: ANON, jwt: ANON, body: { p_slug: "phase1-nope" },
  });
  check("unknown slug returns null", unknown.data === null);
  const probe = await rest("POST", "/rest/v1/rpc/is_slot_available", {
    key: ANON, jwt: ANON,
    body: { p_business_id: B.id, p_start: "2026-09-20T14:30:00Z", p_end: "2026-09-20T15:00:00Z" },
  });
  check("anon cannot probe calendars via is_slot_available", probe.status === 401 || probe.status === 403 || probe.status === 404, `${probe.status}`);
}

// ---------------------------------------------------------------------------
// 9-10: the exclusion constraint
// ---------------------------------------------------------------------------

// The bookings_no_overlap exclusion constraint surfaces as Postgres error
// 23P01. PostgREST versions differ on the HTTP status they map it to
// (409 vs 400), so match on the SQLSTATE, not the status.
const isOverlapRejection = (r) =>
  (r.status === 409 || r.status === 400) && r.data?.code === "23P01";

console.log("test 9: two simultaneous bookings, exactly one wins");
{
  const mk = () =>
    svc.post("/rest/v1/bookings", {
      business_id: A.id, customer_name: "Race", customer_phone: "555-0101",
      start_at: "2026-09-11T17:00:00Z", end_at: "2026-09-11T19:00:00Z", service_type: "mobile",
    });
  const [r1, r2] = await Promise.all([mk(), mk()]);
  const wins = [r1, r2].filter((r) => r.status === 201).length;
  const conflicts = [r1, r2].filter(isOverlapRejection).length;
  check("exactly one success and one overlap rejection", wins === 1 && conflicts === 1, `${r1.status}/${r2.status}`);
}

console.log("test 10: back-to-back booking (end == start) is rejected");
{
  const first = await svc.post("/rest/v1/bookings", {
    business_id: A.id, customer_name: "First", customer_phone: "555-0102",
    start_at: "2026-09-12T17:00:00Z", end_at: "2026-09-12T19:00:00Z", service_type: "mobile",
  });
  const touching = await svc.post("/rest/v1/bookings", {
    business_id: A.id, customer_name: "Touching", customer_phone: "555-0103",
    start_at: "2026-09-12T19:00:00Z", end_at: "2026-09-12T21:00:00Z", service_type: "mobile",
  });
  check("first insert ok", first.status === 201, `${first.status}`);
  check("touching insert rejected", isOverlapRejection(touching), `${touching.status} ${JSON.stringify(touching.data)}`);
}

// ---------------------------------------------------------------------------
// 11: per-business buffer independence
// ---------------------------------------------------------------------------

console.log("test 11: A's buffer change never touches B");
{
  // Both businesses get a booking at the same absolute time.
  await svc.post("/rest/v1/bookings", [
    { business_id: A.id, customer_name: "BufA", customer_phone: "555-0104",
      start_at: "2026-09-13T17:00:00Z", end_at: "2026-09-13T19:00:00Z", service_type: "mobile" },
    { business_id: B.id, customer_name: "BufB", customer_phone: "555-0105",
      start_at: "2026-09-13T17:00:00Z", end_at: "2026-09-13T19:00:00Z", service_type: "mobile" },
  ]);
  const slot = { p_start: "2026-09-13T19:30:00Z", p_end: "2026-09-13T20:30:00Z" };

  const before = await rest("POST", "/rest/v1/rpc/is_slot_available", {
    key: ANON, jwt: userA.jwt, body: { p_business_id: A.id, ...slot },
  });
  check("A: slot inside 60-min buffer is unavailable", before.data === false, JSON.stringify(before.data));

  const patch = await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${A.id}`, {
    key: ANON, jwt: userA.jwt, body: { buffer_minutes: 0 },
  });
  check("A's owner can update A's settings", patch.status === 200 && patch.data?.length === 1, `${patch.status}`);

  const after = await rest("POST", "/rest/v1/rpc/is_slot_available", {
    key: ANON, jwt: userA.jwt, body: { p_business_id: A.id, ...slot },
  });
  check("A: same slot now available with buffer 0", after.data === true, JSON.stringify(after.data));

  const bStill = await rest("POST", "/rest/v1/rpc/is_slot_available", {
    body: { p_business_id: B.id, ...slot },
  });
  check("B: same slot still blocked by B's 60-min buffer", bStill.data === false, JSON.stringify(bStill.data));

  const bSettings = await svc.get(`/rest/v1/business_settings?business_id=eq.${B.id}&select=buffer_minutes`);
  check("B's buffer setting untouched", bSettings.data?.[0]?.buffer_minutes === 60);
}

// ---------------------------------------------------------------------------
// 12: per-business timezones, including a DST boundary
// ---------------------------------------------------------------------------

console.log("test 12: per-business timezone math across DST (2026-03-08)");
{
  const utc = async (bizId, local) => {
    const r = await rest("POST", "/rest/v1/rpc/business_local_to_utc", {
      body: { p_business_id: bizId, p_local: local },
    });
    return Date.parse(r.data);
  };
  // Noon local, the day BEFORE US spring-forward (standard time)
  check("A (LA) 3/7 noon = 20:00 UTC (PST)",
    (await utc(A.id, "2026-03-07T12:00:00")) === Date.parse("2026-03-07T20:00:00Z"));
  check("B (NY) 3/7 noon = 17:00 UTC (EST)",
    (await utc(B.id, "2026-03-07T12:00:00")) === Date.parse("2026-03-07T17:00:00Z"));
  // Noon local, the day AFTER spring-forward (daylight time)
  check("A (LA) 3/9 noon = 19:00 UTC (PDT)",
    (await utc(A.id, "2026-03-09T12:00:00")) === Date.parse("2026-03-09T19:00:00Z"));
  check("B (NY) 3/9 noon = 16:00 UTC (EDT)",
    (await utc(B.id, "2026-03-09T12:00:00")) === Date.parse("2026-03-09T16:00:00Z"));
  // Same wall-clock time is a different instant per business.
  const aNoon = await utc(A.id, "2026-03-09T12:00:00");
  const bNoon = await utc(B.id, "2026-03-09T12:00:00");
  check("same local noon is 3h apart between LA and NY", aNoon - bNoon === 3 * 3600 * 1000);
}

// ---------------------------------------------------------------------------

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
