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
  is_demo: true, slug: "roles-a", name: "Roles Test Detailing", timezone: "America/Los_Angeles",
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

  const r = await fn("invite-user", {
    business_id: biz.id, email: "invitee@staff.test", role: "staff",
    // Roadmap 2.13: the name and the ticks ride ON the invite, so the person
    // who accepts arrives already shaped. `nonsense` is here to prove the edge
    // function drops what the constraint would reject — an unknown permission
    // that reached the table would fail the INSERT and lose the whole invite,
    // and one that reached the array would grant nothing while looking ticked.
    label: "Detailer", permissions: ["requests", "nonsense"],
  }, owner.jwt);
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
  const membership = await svc.get(`/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${session.user.id}&select=role,label,permissions`);
  check("granted staff role", membership.data?.[0]?.role === "staff", JSON.stringify(membership.data));
  check("the invited NAME landed on the membership", membership.data?.[0]?.label === "Detailer", JSON.stringify(membership.data));
  check("the invited ticks landed, with the unknown one dropped",
    JSON.stringify(membership.data?.[0]?.permissions) === JSON.stringify(["requests"]),
    JSON.stringify(membership.data?.[0]?.permissions));
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


// ---------------------------------------------------------------------------
// ROADMAP 2.13 — the permission model. Tests 1-9 above are unchanged on
// purpose: they are the proof that the OLD guarantees survived, and three of
// them are about `protect_last_owner()`, which is a TRIGGER and had to keep
// binding the service role too.
//
// What follows is the new half, and the assertion that matters most is that
// ONE TICK OPENS ONE GROUP. A helper that returned true for everything would
// pass a test that only ever read the group it had just granted, so every case
// below reads the OTHER two as well.
console.log("test 10: one tick opens one group and nothing else");
{
  const GROUPS = {
    money:     "/rest/v1/expenses?select=*",
    settings:  "/rest/v1/business_settings?select=*",
    marketing: "/rest/v1/promo_codes?select=*",
  };
  const readable = async (jwt) => {
    const out = [];
    for (const [name, path] of Object.entries(GROUPS)) {
      const r = await rest("GET", path, { key: ANON, jwt });
      if ((r.data ?? []).length > 0) out.push(name);
    }
    return out.sort().join(",");
  };
  const setPerms = (perms) => rest(
    "PATCH",
    `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`,
    { body: { permissions: perms } },
  );

  // Nothing ticked: the state test 1 already proves, restated as the baseline
  // this walk moves away from.
  await setPerms([]);
  check("no ticks: reads none of the three groups", (await readable(staff.jwt)) === "");

  for (const only of ["money", "settings", "marketing"]) {
    await setPerms([only]);
    const got = await readable(staff.jwt);
    check(`${only}: opens ${only} and ONLY ${only}`, got === only, `got "${got}"`);
  }

  // WRITING, NOT JUST READING. A select policy that opened without an update
  // policy would pass everything above and still refuse every save, which is
  // the page of blanks the dashboard used to show staff.
  await setPerms(["settings"]);
  const w = await rest("PATCH", `/rest/v1/business_settings?business_id=eq.${biz.id}`, {
    key: ANON, jwt: staff.jwt, body: { buffer_minutes: 45 },
  });
  check("settings: the tick also allows the SAVE", w.status === 200 && (w.data ?? []).length === 1,
    `${w.status} ${JSON.stringify(w.data).slice(0, 120)}`);
  const back = await svc.get(`/rest/v1/business_settings?business_id=eq.${biz.id}&select=buffer_minutes`);
  check("settings: the value actually changed", back.data?.[0]?.buffer_minutes === 45, JSON.stringify(back.data));

  const marketingWrite = await rest("POST", "/rest/v1/promo_codes", {
    key: ANON, jwt: staff.jwt, body: { business_id: biz.id, code: "TICKTEST", type: "amount", value: 1 },
  });
  check("settings does not carry marketing's write either", marketingWrite.status === 403, `${marketingWrite.status}`);
}

console.log("test 11: an owner needs no ticks, and never loses one");
{
  const owned = await svc.get(`/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${owner.id}&select=permissions`);
  check("the owner's own list is empty", JSON.stringify(owned.data?.[0]?.permissions) === "[]", JSON.stringify(owned.data));
  // ...and reads everything anyway. This is the fold has_business_permission()
  // does in SQL: no policy can be written that forgets owners.
  for (const path of ["/rest/v1/expenses?select=*", "/rest/v1/business_settings?select=*", "/rest/v1/promo_codes?select=*"]) {
    const r = await rest("GET", path, { key: ANON, jwt: owner.jwt });
    check(`owner reads ${path.split("?")[0].split("/").pop()} with no ticks`, (r.data ?? []).length >= 1, `${r.status}`);
  }
}

console.log("test 12: the vocabulary is closed at the database");
{
  const bad = await rest("PATCH", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`, {
    body: { permissions: ["settings", "everything"] },
  });
  check("an unknown permission is refused by the constraint", bad.status >= 400,
    `${bad.status} ${JSON.stringify(bad.data).slice(0, 140)}`);
  const still = await svc.get(`/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}&select=permissions`);
  check("and the row is unchanged", JSON.stringify(still.data?.[0]?.permissions) === JSON.stringify(["settings"]),
    JSON.stringify(still.data));
}

console.log("test 13: a member cannot tick their own boxes");
{
  // business_users UPDATE is still is_business_owner() — deliberately NOT a
  // permission, because whoever can hand out permissions can hand themselves
  // every other one. RLS returns 200 with zero rows rather than an error.
  const grab = await rest("PATCH", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`, {
    key: ANON, jwt: staff.jwt, body: { permissions: ["money", "settings", "marketing", "requests"] },
  });
  check("a member cannot grant themselves a permission", grab.status === 200 && (grab.data ?? []).length === 0,
    `${grab.status} ${JSON.stringify(grab.data)}`);
  const still = await svc.get(`/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}&select=permissions`);
  check("still just the one they were given", JSON.stringify(still.data?.[0]?.permissions) === JSON.stringify(["settings"]),
    JSON.stringify(still.data));
  const rename = await rest("PATCH", `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`, {
    key: ANON, jwt: staff.jwt, body: { label: "Manager" },
  });
  check("a member cannot rename their own role either", rename.status === 200 && (rename.data ?? []).length === 0, `${rename.status}`);
}

console.log("test 14: answering a booking request is a tick");
{
  const pending = (await svc.post("/rest/v1/bookings", [{
    business_id: biz.id, customer_name: "Asker", customer_phone: "555-9100",
    customer_email: "delivered@resend.dev",
    start_at: "2026-11-05T18:00:00Z", end_at: "2026-11-05T20:00:00Z",
    service_type: "mobile", status: "pending",
    total_price: 100, subtotal: 100, final_amount: 100,
  }])).data[0];
  const setPerms = (perms) => rest(
    "PATCH",
    `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`,
    { body: { permissions: perms } },
  );

  // Without it — and this is the one permission 2.13 TAKES AWAY rather than
  // adds, which is why the migration backfilled every existing staff row.
  await setPerms(["settings"]);
  const denied = await fn("respond-to-booking", { business_id: biz.id, booking_id: pending.id, action: "accept" }, staff.jwt);
  check("no tick: answering a request is refused", denied.status === 403,
    `${denied.status} ${JSON.stringify(denied.data).slice(0, 120)}`);
  const untouched = await svc.get(`/rest/v1/bookings?id=eq.${pending.id}&select=status`);
  check("and the request is still waiting", untouched.data?.[0]?.status === "pending", JSON.stringify(untouched.data));

  await setPerms(["requests"]);
  const ok = await fn("respond-to-booking", { business_id: biz.id, booking_id: pending.id, action: "accept" }, staff.jwt);
  check("with the tick: accepted", ok.status === 200, `${ok.status} ${JSON.stringify(ok.data).slice(0, 160)}`);
  const now = await svc.get(`/rest/v1/bookings?id=eq.${pending.id}&select=status`);
  check("the booking is confirmed", now.data?.[0]?.status === "confirmed", JSON.stringify(now.data));
  await svc.del(`/rest/v1/bookings?id=eq.${pending.id}`);
}



console.log("test 15: prices and hours are behind the settings tick too");
{
  // THE TICK'S OWN WORDS ARE "Prices, hours, booking rules, branding and the
  // business's own details", and until 20260904001000 the first two were not
  // true: `services` and `business_hours` were *_tenant_all, writable by any
  // member since long before there were two roles. Nothing in the dashboard
  // offered it — but RLS is the enforcement in this product and a browser is
  // not the only client.
  const setPerms = (perms) => rest(
    "PATCH",
    `/rest/v1/business_users?business_id=eq.${biz.id}&user_id=eq.${staff.id}`,
    { body: { permissions: perms } },
  );
  await setPerms([]);

  // READING STAYS OPEN, and that is load-bearing: a member has to read
  // `services` to take a booking at all.
  const read = await rest("GET", "/rest/v1/services?select=id,price", { key: ANON, jwt: staff.jwt });
  check("no ticks: still reads services (needed to book)", (read.data ?? []).length >= 1, `${read.status}`);
  const hours = await rest("GET", "/rest/v1/business_hours?select=weekday", { key: ANON, jwt: staff.jwt });
  check("no ticks: still reads the opening hours", hours.status === 200, `${hours.status}`);

  const reprice = await rest("PATCH", `/rest/v1/services?id=eq.${service.id}`, {
    key: ANON, jwt: staff.jwt, body: { price: 1 },
  });
  check("no ticks: cannot change what the business charges",
    reprice.status === 200 && (reprice.data ?? []).length === 0, `${reprice.status} ${JSON.stringify(reprice.data)}`);
  const unchanged = await svc.get(`/rest/v1/services?id=eq.${service.id}&select=price`);
  check("and the price really did not move", Number(unchanged.data?.[0]?.price) === 100, JSON.stringify(unchanged.data));

  const newService = await rest("POST", "/rest/v1/services", {
    key: ANON, jwt: staff.jwt, body: { business_id: biz.id, name: "Sneaky", price: 5, duration_minutes: 30 },
  });
  check("no ticks: cannot add a service either", newService.status === 403, `${newService.status}`);

  await setPerms(["settings"]);
  const ok = await rest("PATCH", `/rest/v1/services?id=eq.${service.id}`, {
    key: ANON, jwt: staff.jwt, body: { price: 120 },
  });
  check("with the settings tick: the price change goes through",
    ok.status === 200 && (ok.data ?? []).length === 1, `${ok.status} ${JSON.stringify(ok.data).slice(0, 120)}`);
  const moved = await svc.get(`/rest/v1/services?id=eq.${service.id}&select=price`);
  check("and it landed", Number(moved.data?.[0]?.price) === 120, JSON.stringify(moved.data));
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
