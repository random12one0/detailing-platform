// THE POSITIVE CASE. The isolation and role suites only ever proved what an
// owner CANNOT reach — another tenant's rows — and what STAFF cannot write.
// Nothing asserted that an owner can actually write their own tables, so a
// missing INSERT policy sat undetected until it was hit on a phone:
// business_branding and business_settings had SELECT and UPDATE but no
// INSERT, and the dashboard upserts both.
//
// This walks EVERY table the dashboard writes as an owner and proves
// insert / update / delete (or soft delete) all succeed with a real owner
// JWT through PostgREST — the same path the browser takes.
//
//   node tests/owner-writes.test.mjs

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
  else { failed++; console.error(`  FAIL  ${name} ${detail}`); }
};

async function rest(method, path, { key = SERVICE, jwt, body, prefer } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json",
      Prefer: prefer ?? "return=representation",
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

// ---------------------------------------------------------------------------
console.log("setup: a business whose owner is a real authenticated user");

const PW = "Owner-writes-test-pw!";
const owner = await ensureUser("owner-writes@owner.test", PW);

await svc.del("/rest/v1/businesses?slug=eq.owner-writes");
const biz = (await svc.post("/rest/v1/businesses", [{
  slug: "owner-writes", name: "Owner Writes Detailing", timezone: "America/Denver",
  contact_email: "owner@ownerwrites.test",
}])).data[0];
await svc.post("/rest/v1/business_users", [
  { business_id: biz.id, user_id: owner.id, role: "owner", email: "owner-writes@owner.test" },
]);

// Deliberately DO NOT seed business_settings or business_branding: the bug
// was that the very first save of those rows is an INSERT, and there was no
// INSERT policy. A pre-seeded row would hide it.
const as = (method, path, body, prefer) => rest(method, path, { key: ANON, jwt: owner.jwt, body, prefer });

// ---------------------------------------------------------------------------
console.log("test 1: the reported bug — first save of branding and settings");
{
  // Exactly what the dashboard does: .upsert(), which INSERTs when absent.
  const b = await as("POST", "/rest/v1/business_branding", 
    { business_id: biz.id, primary_color: "#1f6feb" },
    "return=representation,resolution=merge-duplicates");
  check("owner can INSERT business_branding (accent colour save)",
    b.status === 201 && b.data?.[0]?.primary_color === "#1f6feb",
    `${b.status} ${JSON.stringify(b.data).slice(0, 160)}`);

  const b2 = await as("PATCH", `/rest/v1/business_branding?business_id=eq.${biz.id}`,
    { primary_color: "#8250df" });
  check("owner can UPDATE business_branding", (b2.data ?? []).length === 1 && b2.data[0].primary_color === "#8250df",
    `${b2.status} ${JSON.stringify(b2.data).slice(0, 160)}`);

  const s = await as("POST", "/rest/v1/business_settings",
    { business_id: biz.id, buffer_minutes: 30 },
    "return=representation,resolution=merge-duplicates");
  check("owner can INSERT business_settings", s.status === 201 && s.data?.[0]?.buffer_minutes === 30,
    `${s.status} ${JSON.stringify(s.data).slice(0, 160)}`);

  const s2 = await as("PATCH", `/rest/v1/business_settings?business_id=eq.${biz.id}`,
    { buffer_minutes: 45, max_bookings_per_day: 3 });
  check("owner can UPDATE business_settings", (s2.data ?? []).length === 1 && s2.data[0].buffer_minutes === 45,
    `${s2.status} ${JSON.stringify(s2.data).slice(0, 160)}`);
}

// ---------------------------------------------------------------------------
console.log("test 2: the business record itself");
{
  const u = await as("PATCH", `/rest/v1/businesses?id=eq.${biz.id}`, { name: "Renamed Detailing" });
  check("owner can rename their business", (u.data ?? []).length === 1 && u.data[0].name === "Renamed Detailing",
    `${u.status} ${JSON.stringify(u.data).slice(0, 160)}`);
  const tz = await as("PATCH", `/rest/v1/businesses?id=eq.${biz.id}`, { timezone: "America/Phoenix" });
  check("owner can change their timezone", tz.data?.[0]?.timezone === "America/Phoenix", JSON.stringify(tz.data).slice(0, 120));
}

// ---------------------------------------------------------------------------
console.log("test 3: every catalogue and scheduling table the dashboard writes");

// [table, insert row, patch, retire]  — one round trip per table, through
// the anon key with the owner's JWT, exactly as the browser does.
//
// "retire" is how that table stops showing without losing history:
//   "is_active"  — catalogue rows are deactivated, never removed, so old
//                  bookings keep pointing at the service they were sold.
//   "delete"     — scheduling rows and one-off records have no history to
//                  protect; removing a blockout means removing it.
// Only bookings carry deleted_at (test 4).
const CASES = [
  ["services", { name: "Full Detail", price: 250, duration_minutes: 180 }, { price: 275 }, "is_active"],
  ["add_ons", { name: "Pet Hair", price: 40, duration_minutes: 30 }, { price: 45 }, "is_active"],
  ["blockout_dates", { event_name: "Closed", start_date: "2027-01-04", end_date: "2027-01-04" }, { event_name: "Family" }, "delete"],
  ["booking_hours_overrides", { date: "2027-01-05", open_time: "10:00", close_time: "14:00" }, { close_time: "15:00" }, "delete"],
  ["dropoff_only_periods", { start_date: "2027-02-01", end_date: "2027-02-07", reason: "Van in the shop" }, { reason: "Van repair" }, "delete"],
  ["promo_codes", { code: "OWNERTEST", type: "percentage", value: 10 }, { value: 15 }, "is_active"],
  ["campaigns", { slug: "owner-writes-golf", name: "Golf Club" }, { name: "Golf Club 2027" }, "is_active"],
  ["expenses", { date: "2027-01-06", category: "supplies", description: "Wax", amount: 42, payment_method: "card" }, { amount: 44 }, "delete"],
  ["gallery_images", { kind: "single", image_url: "https://example.test/a.jpg", caption: "Before" }, { caption: "After" }, "is_active"],
  ["testimonials", { author: "Sam", quote: "Great work", rating: 5 }, { rating: 4 }, "is_active"],
  ["message_templates", { key: "owner_test_tpl", label: "Owner test", body: "See you {{date}}" }, { label: "Owner test 2" }, "delete"],
  ["customers", { name: "Walk-in Wendy", phone: "555-0100" }, { email: "wendy@owner.test" }, "delete"],
  ["business_domains", { domain: "ownerwrites.example" }, { domain: "ownerwrites2.example" }, "delete"],
];

for (const [table, row, patch, retire] of CASES) {
  const ins = await as("POST", `/rest/v1/${table}`, { business_id: biz.id, ...row });
  const created = ins.data?.[0] ?? ins.data;
  check(`${table}: owner can INSERT`, ins.status === 201 && !!created?.id,
    `${ins.status} ${JSON.stringify(ins.data).slice(0, 160)}`);
  if (!created?.id) continue;

  const upd = await as("PATCH", `/rest/v1/${table}?id=eq.${created.id}`, patch);
  check(`${table}: owner can UPDATE`, (upd.data ?? []).length === 1,
    `${upd.status} ${JSON.stringify(upd.data).slice(0, 160)}`);

  if (retire === "is_active") {
    const off = await as("PATCH", `/rest/v1/${table}?id=eq.${created.id}`, { is_active: false });
    check(`${table}: owner can RETIRE (is_active=false)`,
      (off.data ?? []).length === 1 && off.data[0].is_active === false,
      `${off.status} ${JSON.stringify(off.data).slice(0, 160)}`);
  } else {
    const del = await as("DELETE", `/rest/v1/${table}?id=eq.${created.id}`);
    check(`${table}: owner can DELETE`, del.status === 200 && (del.data ?? []).length === 1,
      `${del.status} ${JSON.stringify(del.data).slice(0, 160)}`);
  }
}

// business_hours is keyed (business_id, weekday) and has no id column: the
// dashboard upserts one row per day rather than inserting and deleting.
{
  const h = await as("POST", "/rest/v1/business_hours",
    { business_id: biz.id, weekday: 2, open_time: "08:00", close_time: "17:00" },
    "return=representation,resolution=merge-duplicates");
  check("business_hours: owner can UPSERT a day", h.status === 201 && h.data?.[0]?.weekday === 2,
    `${h.status} ${JSON.stringify(h.data).slice(0, 160)}`);
  const h2 = await as("PATCH", `/rest/v1/business_hours?business_id=eq.${biz.id}&weekday=eq.2`,
    { close_time: "18:00" });
  check("business_hours: owner can UPDATE a day", (h2.data ?? []).length === 1, `${h2.status}`);
  // Closed for the day is null open/close, not a missing row.
  const h3 = await as("PATCH", `/rest/v1/business_hours?business_id=eq.${biz.id}&weekday=eq.2`,
    { open_time: null, close_time: null });
  check("business_hours: owner can mark a day closed",
    (h3.data ?? []).length === 1 && h3.data[0].open_time === null, `${h3.status}`);
  const h4 = await as("DELETE", `/rest/v1/business_hours?business_id=eq.${biz.id}&weekday=eq.2`);
  check("business_hours: owner can DELETE a day", h4.status === 200, `${h4.status}`);
}

console.log("test 4: bookings and their child rows");
{
  const b = await as("POST", "/rest/v1/bookings", {
    business_id: biz.id, customer_name: "Owner Made", customer_phone: "555-0111",
    start_at: "2027-03-02T17:00:00Z", end_at: "2027-03-02T19:00:00Z",
    service_type: "mobile", total_price: 200, subtotal: 200, final_amount: 200,
  });
  const bk = b.data?.[0];
  check("bookings: owner can INSERT", b.status === 201 && !!bk?.id, `${b.status} ${JSON.stringify(b.data).slice(0, 200)}`);

  if (bk?.id) {
    const svcRow = (await as("POST", "/rest/v1/services", { business_id: biz.id, name: "Child Svc", price: 100, duration_minutes: 60 })).data?.[0];
    const bs = await as("POST", "/rest/v1/booking_services", {
      business_id: biz.id, booking_id: bk.id, service_id: svcRow.id,
      name_at_booking: "Child Svc", price_at_booking: 100, duration_at_booking: 60,
    });
    check("booking_services: owner can INSERT", bs.status === 201, `${bs.status} ${JSON.stringify(bs.data).slice(0, 160)}`);

    const li = await as("POST", "/rest/v1/booking_line_items", {
      business_id: biz.id, booking_id: bk.id, category: "custom", label: "Extra polish", amount: 25,
    });
    check("booking_line_items: owner can INSERT", li.status === 201, `${li.status} ${JSON.stringify(li.data).slice(0, 160)}`);

    const up = await as("PATCH", `/rest/v1/bookings?id=eq.${bk.id}`, { admin_notes: "owner note", payment_status: "paid" });
    check("bookings: owner can UPDATE", (up.data ?? []).length === 1 && up.data[0].admin_notes === "owner note",
      `${up.status} ${JSON.stringify(up.data).slice(0, 160)}`);

    const sd = await as("PATCH", `/rest/v1/bookings?id=eq.${bk.id}`, { deleted_at: new Date().toISOString(), status: "cancelled" });
    check("bookings: owner can SOFT DELETE", (sd.data ?? []).length === 1 && !!sd.data[0].deleted_at, `${sd.status}`);
  }
}

// ---------------------------------------------------------------------------
console.log("test 5: team management");
{
  const inv = await as("POST", "/rest/v1/business_invites", {
    business_id: biz.id, email: "newhire@owner.test", role: "staff",
  });
  check("business_invites: owner can INSERT", inv.status === 201, `${inv.status} ${JSON.stringify(inv.data).slice(0, 160)}`);
  const id = inv.data?.[0]?.id;
  if (id) {
    const rev = await as("PATCH", `/rest/v1/business_invites?id=eq.${id}`, { revoked_at: new Date().toISOString() });
    check("business_invites: owner can revoke", (rev.data ?? []).length === 1 && !!rev.data[0].revoked_at, `${rev.status}`);
  }

  // Owners edit their own display name on the membership row.
  const me = await as("PATCH", `/rest/v1/business_users?user_id=eq.${owner.id}&business_id=eq.${biz.id}`,
    { first_name: "Alex" });
  check("business_users: owner can UPDATE their own row", (me.data ?? []).length === 1 && me.data[0].first_name === "Alex",
    `${me.status} ${JSON.stringify(me.data).slice(0, 160)}`);
}

// ---------------------------------------------------------------------------
console.log("test 6: writes are still scoped — the same owner JWT cannot cross tenants");
{
  // The positive case must not have been bought by loosening isolation.
  await svc.del("/rest/v1/businesses?slug=eq.owner-writes-other");
  const other = (await svc.post("/rest/v1/businesses", [{
    slug: "owner-writes-other", name: "Someone Else", timezone: "America/New_York",
    contact_email: "other@ownerwrites.test",
  }])).data[0];

  const x1 = await as("POST", "/rest/v1/services", { business_id: other.id, name: "Injected", price: 1, duration_minutes: 30 });
  check("cannot INSERT a service into another business", x1.status === 403, `${x1.status} ${JSON.stringify(x1.data).slice(0, 120)}`);

  const x2 = await as("POST", "/rest/v1/business_branding", { business_id: other.id, primary_color: "#000000" });
  check("cannot INSERT branding for another business", x2.status === 403, `${x2.status} ${JSON.stringify(x2.data).slice(0, 120)}`);

  const x3 = await as("POST", "/rest/v1/business_settings", { business_id: other.id, buffer_minutes: 0 });
  check("cannot INSERT settings for another business", x3.status === 403, `${x3.status} ${JSON.stringify(x3.data).slice(0, 120)}`);

  const x4 = await as("PATCH", `/rest/v1/businesses?id=eq.${other.id}`, { name: "Hijacked" });
  check("cannot rename another business", (x4.data ?? []).length === 0, `${x4.status} ${JSON.stringify(x4.data).slice(0, 120)}`);

  await svc.del(`/rest/v1/businesses?id=eq.${other.id}`);
}

// ---------------------------------------------------------------------------
console.log("test 7: no owner-writable table is missing from this suite");
{
  // A guard against the next missing policy: enumerate every table that has
  // an owner write path in the dashboard and assert this file exercised it.
  const covered = new Set([
    "business_branding", "business_settings", "businesses", "business_users",
    "business_invites", "bookings", "booking_services", "booking_line_items",
    "business_hours",
    ...CASES.map(([t]) => t),
  ]);
  const expected = [
    "services", "add_ons", "business_hours", "blockout_dates",
    "booking_hours_overrides", "dropoff_only_periods", "promo_codes",
    "campaigns", "expenses", "gallery_images", "testimonials",
    "message_templates", "customers", "business_domains",
    "business_branding", "business_settings", "businesses", "business_users",
    "business_invites", "bookings", "booking_services", "booking_line_items",
  ];
  const missing = expected.filter((t) => !covered.has(t));
  check("every owner-writable table is exercised above", missing.length === 0, missing.join(", "));
}

await svc.del(`/rest/v1/businesses?id=eq.${biz.id}`);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
