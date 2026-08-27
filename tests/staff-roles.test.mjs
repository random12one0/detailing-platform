// Staff/owner role enforcement, tested AT THE DATABASE with a real staff
// session — not through the UI. A staff JWT must get zero rows from
// expenses, business_settings, promo_codes and campaigns no matter what any
// frontend does.
//
//   node tests/staff-roles.test.mjs

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

async function rest(method, path, { key = SERVICE, jwt, body } = {}) {
  const res = await fetch(`${URL_}${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${jwt ?? key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}
const svc = { get: (p) => rest("GET", p), post: (p, b) => rest("POST", p, { body: b }), del: (p) => rest("DELETE", p) };

async function fn(name, body, jwt, method = "POST") {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method,
    headers: { "Content-Type": "application/json", apikey: ANON, ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) },
    body: method === "GET" ? undefined : JSON.stringify(body),
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
const signIn = async (email, password) => {
  const r = await fetch(`${URL_}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return r.json();
};

// ---------------------------------------------------------------------------
console.log("setup: one business, an owner and a staff member");

const PW = "Phase2-roles-test-pw!";
const owner = await ensureUser("roles-owner@staff.test", PW);
const staff = await ensureUser("roles-staff@staff.test", PW);
const owner2 = await ensureUser("roles-owner2@staff.test", PW);

await svc.del("/rest/v1/businesses?slug=eq.roles-a");
const biz = (await svc.post("/rest/v1/businesses", [{
  slug: "roles-a", name: "Roles Test Detailing", timezone: "America/Los_Angeles",
  contact_email: "owner@roles.test",
}])).data[0];
await svc.post("/rest/v1/business_users", [
  { business_id: biz.id, user_id: owner.id, role: "owner", email: "roles-owner@staff.test" },
  { business_id: biz.id, user_id: staff.id, role: "staff", email: "roles-staff@staff.test" },
]);
await svc.post("/rest/v1/business_settings", [{ business_id: biz.id }]);
await svc.post("/rest/v1/expenses", [{
  business_id: biz.id, date: "2026-08-01", category: "supplies",
  description: "secret expense", amount: 99, payment_method: "cash",
}]);
await svc.post("/rest/v1/promo_codes", [{ business_id: biz.id, code: "STAFFTEST", type: "amount", value: 5 }]);
await svc.post("/rest/v1/campaigns", [{ business_id: biz.id, slug: "roles-golf", name: "Golf" }]);
const service = (await svc.post("/rest/v1/services", [{
  business_id: biz.id, name: "Detail", price: 100, duration_minutes: 60,
}])).data[0];
const booking = (await svc.post("/rest/v1/bookings", [{
  business_id: biz.id, customer_name: "Cust", customer_phone: "555-9000",
  start_at: "2026-10-05T18:00:00Z", end_at: "2026-10-05T20:00:00Z",
  service_type: "mobile", total_price: 100, subtotal: 100, final_amount: 100, payment_status: "paid",
}])).data[0];

// ---------------------------------------------------------------------------
console.log("test 1: a staff session gets ZERO rows from owner-only tables");
for (const table of ["expenses", "business_settings", "promo_codes", "campaigns", "campaign_visits"]) {
  const r = await rest("GET", `/rest/v1/${table}?select=*`, { key: ANON, jwt: staff.jwt });
  check(`${table}: staff reads nothing`, r.status === 200 && (r.data ?? []).length === 0, `${r.status} ${JSON.stringify(r.data).slice(0, 120)}`);
}
{
  // The same queries as the owner DO return rows — proving the data exists
  // and it is the role, not an empty table, doing the blocking.
  const e = await rest("GET", "/rest/v1/expenses?select=*", { key: ANON, jwt: owner.jwt });
  const s = await rest("GET", "/rest/v1/business_settings?select=*", { key: ANON, jwt: owner.jwt });
  check("owner sees the expense", (e.data ?? []).length === 1, JSON.stringify(e.data));
  check("owner sees the settings", (s.data ?? []).length === 1);
}

console.log("test 2: staff cannot revenue-query, even indirectly");
{
  // A revenue aggregate over bookings: staff CAN see bookings (they need
  // the calendar) but must not reach the money tables. Verify the money
  // columns are unreachable through expenses and settings, and that a
  // direct write is refused too.
  const w = await rest("POST", "/rest/v1/expenses", {
    key: ANON, jwt: staff.jwt,
    body: { business_id: biz.id, date: "2026-08-02", category: "x", description: "staff-added", amount: 1, payment_method: "cash" },
  });
  check("staff cannot insert an expense", w.status === 403, `${w.status}`);
  const p = await rest("POST", "/rest/v1/promo_codes", {
    key: ANON, jwt: staff.jwt,
    body: { business_id: biz.id, code: "STAFFMADE", type: "amount", value: 1 },
  });
  check("staff cannot create a promo code", p.status === 403, `${p.status}`);
  const su = await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${biz.id}`, {
    key: ANON, jwt: staff.jwt, body: { buffer_minutes: 0 },
  });
  check("staff cannot change booking rules", su.status === 200 && (su.data ?? []).length === 0, `${su.status} ${JSON.stringify(su.data)}`);
  const after = await svc.get(`/rest/v1/business_settings?business_id=eq.${biz.id}&select=buffer_minutes`);
  check("buffer unchanged after staff attempt", after.data?.[0]?.buffer_minutes === 60);
}

console.log("test 3: staff CAN do their job (bookings, calendar, customers)");
{
  const b = await rest("GET", "/rest/v1/bookings?select=id,customer_name", { key: ANON, jwt: staff.jwt });
  check("staff sees bookings", (b.data ?? []).length >= 1, JSON.stringify(b.data).slice(0, 120));
  const upd = await fn("update-booking", { business_id: biz.id, booking_id: booking.id, admin_notes: "staff note" }, staff.jwt);
  check("staff can edit a booking", upd.status === 200 && upd.data?.booking?.admin_notes === "staff note", JSON.stringify(upd.data).slice(0, 150));
  const c = await rest("GET", "/rest/v1/customers?select=id", { key: ANON, jwt: staff.jwt });
  check("staff can read customers", c.status === 200, `${c.status}`);
  const s = await rest("GET", "/rest/v1/services?select=id", { key: ANON, jwt: staff.jwt });
  check("staff can read services (needed to book)", (s.data ?? []).length >= 1);
}

console.log("test 4: invites — owner only, 7-day expiry, revocable");
let inviteToken;
{
  const denied = await fn("invite-user", { business_id: biz.id, email: "nope@staff.test", role: "staff" }, staff.jwt);
  check("staff cannot invite", denied.status === 403, `${denied.status}`);

  const r = await fn("invite-user", { business_id: biz.id, email: "invitee@staff.test", role: "staff" }, owner.jwt);
  check("owner can invite", r.status === 200 && !!r.data?.invite?.link, JSON.stringify(r.data).slice(0, 150));
  inviteToken = r.data?.invite?.link?.split("/invite/")[1];
  const days = (new Date(r.data.invite.expires_at) - Date.now()) / 86400_000;
  check("invite expires in ~7 days", days > 6.9 && days < 7.1, String(days));

  const info = await fn("accept-invite", null, null, "GET");
  check("accept-invite needs a token", info.status === 400, `${info.status}`);

  const staffSees = await rest("GET", "/rest/v1/business_invites?select=id", { key: ANON, jwt: staff.jwt });
  check("staff cannot list invites", (staffSees.data ?? []).length === 0, JSON.stringify(staffSees.data));
}

console.log("test 5: expired and revoked invites are refused");
{
  const expired = (await svc.post("/rest/v1/business_invites", [{
    business_id: biz.id, email: "expired@staff.test", role: "staff",
    expires_at: new Date(Date.now() - 86400_000).toISOString(),
  }])).data[0];
  const r1 = await fn("accept-invite", { token: expired.token, password: "Whatever-123" });
  check("expired invite refused", r1.status === 400 && /expired/i.test(r1.data?.error || ""), JSON.stringify(r1.data));

  const revoked = (await svc.post("/rest/v1/business_invites", [{
    business_id: biz.id, email: "revoked@staff.test", role: "staff",
    revoked_at: new Date().toISOString(),
  }])).data[0];
  const r2 = await fn("accept-invite", { token: revoked.token, password: "Whatever-123" });
  check("revoked invite refused", r2.status === 400 && /cancelled/i.test(r2.data?.error || ""), JSON.stringify(r2.data));
}

console.log("test 6: accepting an invite grants exactly the invited role");
{
  const r = await fn("accept-invite", { token: inviteToken, password: "Invitee-pass-123" });
  check("invite accepted", r.status === 200, JSON.stringify(r.data));
  const session = await signIn("invitee@staff.test", "Invitee-pass-123");
  check("invited user can sign in", !!session.access_token, JSON.stringify(session).slice(0, 120));
  const membership = await svc.get(`/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${session.user.id}&select=role`);
  check("granted staff role", membership.data?.[0]?.role === "staff", JSON.stringify(membership.data));
  const money = await rest("GET", "/rest/v1/expenses?select=*", { key: ANON, jwt: session.access_token });
  check("newly-invited staff also sees no money data", (money.data ?? []).length === 0);
  const reuse = await fn("accept-invite", { token: inviteToken, password: "x" });
  check("token cannot be reused", reuse.status === 400 && /already/i.test(reuse.data?.error || ""), JSON.stringify(reuse.data));
}

console.log("test 7: removing a member revokes access immediately");
{
  const removed = await rest("DELETE", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`, {
    key: ANON, jwt: owner.jwt,
  });
  check("owner can remove staff", removed.status === 200, `${removed.status}`);
  const after = await rest("GET", "/rest/v1/bookings?select=id", { key: ANON, jwt: staff.jwt });
  check("removed staff's existing session now reads nothing", (after.data ?? []).length === 0, JSON.stringify(after.data).slice(0, 100));
  // Put them back for the remaining tests.
  await svc.post("/rest/v1/business_users", [{ business_id: biz.id, user_id: staff.id, role: "staff", email: "roles-staff@staff.test" }]);
}

console.log("test 8: the last owner cannot be removed or demoted");
{
  const demote = await rest("PATCH", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${owner.id}`, {
    key: ANON, jwt: owner.jwt, body: { role: "staff" },
  });
  check("last owner cannot be demoted", demote.status >= 400, `${demote.status} ${JSON.stringify(demote.data).slice(0, 120)}`);
  const del = await rest("DELETE", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${owner.id}`, {
    key: ANON, jwt: owner.jwt,
  });
  check("last owner cannot be removed", del.status >= 400, `${del.status}`);
  // Even the service role (which bypasses RLS) is bound by the trigger.
  const svcDel = await svc.del(`/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${owner.id}`);
  check("not even the service role can remove the last owner", svcDel.status >= 400, `${svcDel.status}`);

  // With a second owner present, demotion is allowed again.
  await svc.post("/rest/v1/business_users", [{ business_id: biz.id, user_id: owner2.id, role: "owner", email: "roles-owner2@staff.test" }]);
  const ok = await rest("PATCH", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${owner2.id}`, {
    key: ANON, jwt: owner.jwt, body: { role: "staff" },
  });
  check("a non-last owner can be demoted", ok.status === 200 && ok.data?.[0]?.role === "staff", `${ok.status} ${JSON.stringify(ok.data).slice(0, 120)}`);
}

console.log("test 9: staff cannot escalate their own role");
{
  const selfPromote = await rest("PATCH", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`, {
    key: ANON, jwt: staff.jwt, body: { role: "owner" },
  });
  check("staff cannot promote themselves", selfPromote.status === 200 && (selfPromote.data ?? []).length === 0, `${selfPromote.status} ${JSON.stringify(selfPromote.data)}`);
  const check2 = await svc.get(`/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}&select=role`);
  check("still staff", check2.data?.[0]?.role === "staff");
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
